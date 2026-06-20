import logging
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from celery.result import AsyncResult
from django_filters.rest_framework import DjangoFilterBackend

from .models import Application, ApplicationStatusHistory, Status, AIProcessingLog
from .serializers import (
    ApplicationListSerializer,
    ApplicationDetailSerializer,
    ApplicationCreateSerializer,
    ApplicationStatusHistorySerializer,
    MoveStatusSerializer,
    OverrideScoreSerializer,
    StatusSerializer,
)
from apps.accounts.permissions import IsHRManagerOrAdmin
from .throttles import AISubmitThrottle

logger = logging.getLogger(__name__)


class StatusViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/statuses/       — list all pipeline statuses ordered by sequence
    GET /api/statuses/{id}/  — single status detail
    """
    queryset = Status.objects.all()
    serializer_class = StatusSerializer
    permission_classes = [IsAuthenticated]


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    Full CRUD + custom actions for Applications.

    Standard endpoints:
        GET    /api/applications/         — paginated list
        POST   /api/applications/         — submit new application
        GET    /api/applications/{id}/    — full application detail
        PATCH  /api/applications/{id}/    — partial update

    Custom actions:
        PATCH  /api/applications/{id}/move-status/    — move pipeline stage
        PATCH  /api/applications/{id}/override-score/ — override AI score
        GET    /api/applications/{id}/resume/         — download resume file
    """
    queryset = Application.objects.select_related(
        'job', 'job__department',
        'candidate',
    ).prefetch_related(
        'status_history',
        'status_history__status',
        'status_history__changed_by',
        'extracted_skills',
    ).all()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['job', 'candidate']
    search_fields = ['candidate__first_name', 'candidate__last_name', 'job__title']
    ordering_fields = ['applied_date', 'ai_match_score']
    ordering = ['-applied_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return ApplicationListSerializer
        if self.action == 'create':
            return ApplicationCreateSerializer
        return ApplicationDetailSerializer
    def get_throttles(self):
        """
        Apply the strict AI submission throttle only to the create
        action (resume upload), since that's the only action that
        triggers a real AI API call.
        """
        if self.action == 'create':
            self.throttle_scope = 'ai_submit'
            return [AISubmitThrottle()]
        return super().get_throttles()

    def get_permissions(self):
        if self.action in ['move_status', 'override_score', 'destroy']:
            return [IsAuthenticated(), IsHRManagerOrAdmin()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """
        POST /api/applications/
        Submits a new application with a resume file.
        Returns the application data plus the Celery task_id
        for the frontend to poll.
        """
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        application = serializer.save()

        # Return 202 Accepted — the AI processing is happening in background
        response_data = ApplicationDetailSerializer(
            application,
            context={'request': request}
        ).data
        response_data['task_id'] = getattr(application, 'task_id', None)

        return Response(response_data, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['patch'], url_path='move-status')
    def move_status(self, request, pk=None):
        """
        PATCH /api/applications/{id}/move-status/
        Moves an application to a new pipeline stage.
        Creates a new ApplicationStatusHistory record.
        Requires HR Manager or Admin role.
        """
        application = self.get_object()
        serializer = MoveStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = get_object_or_404(
            Status, id=serializer.validated_data['status_id']
        )

        history_entry = ApplicationStatusHistory.objects.create(
            application=application,
            status=new_status,
            changed_by=request.user,
        )

        logger.info(
            f'[Applications] Application {application.id} moved to '
            f'"{new_status.status_name}" by {request.user.email}'
        )

        return Response(
            ApplicationStatusHistorySerializer(history_entry).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['patch'], url_path='override-score')
    def override_score(self, request, pk=None):
        """
        PATCH /api/applications/{id}/override-score/
        Allows HR to manually override the AI-generated match score.
        Sets human_override_applied=True in the AI log.
        Requires HR Manager or Admin role.
        """
        application = self.get_object()
        serializer = OverrideScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_score = serializer.validated_data['ai_match_score']
        application.ai_match_score = new_score
        application.save(update_fields=['ai_match_score'])

        # Mark the AI log as human-overridden
        AIProcessingLog.objects.update_or_create(
            application=application,
            defaults={'human_override_applied': True}
        )

        logger.info(
            f'[Applications] AI score for application {application.id} '
            f'overridden to {new_score} by {request.user.email}'
        )

        return Response(
            {'ai_match_score': new_score, 'human_override_applied': True},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'], url_path='resume')
    def resume(self, request, pk=None):
        """
        GET /api/applications/{id}/resume/
        Streams the resume file after verifying the user is authenticated.
        Resumes are never served as static files — always through this
        permission-checked endpoint.
        """
        application = self.get_object()

        if not application.resume_file:
            return Response(
                {'detail': 'No resume file found for this application.'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            response = FileResponse(
                application.resume_file.open('rb'),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = (
                f'inline; filename="{application.candidate.get_full_name()}_resume.pdf"'
            )
            return response
        except FileNotFoundError:
            return Response(
                {'detail': 'Resume file not found on disk.'},
                status=status.HTTP_404_NOT_FOUND
            )


class TaskStatusView(viewsets.ViewSet):
    """
    GET /api/tasks/{task_id}/
    Returns the current status of a Celery background task.
    Used by the frontend to poll for AI processing completion.
    """
    permission_classes = [IsAuthenticated]

    def retrieve(self, request, pk=None):
        task_result = AsyncResult(pk)
        response_data = {
            'task_id': pk,
            'status': task_result.status,
            'result': None,
        }

        if task_result.status == 'SUCCESS':
            response_data['result'] = task_result.result
        elif task_result.status == 'FAILURE':
            response_data['result'] = {'error': str(task_result.result)}

        return Response(response_data)
