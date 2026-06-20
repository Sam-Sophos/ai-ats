import logging
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Interview, Evaluation
from .serializers import (
    InterviewListSerializer,
    InterviewDetailSerializer,
    InterviewWriteSerializer,
    EvaluationSerializer,
    EvaluationWriteSerializer,
)
from apps.accounts.permissions import IsHRManagerOrAdmin

logger = logging.getLogger(__name__)


class InterviewViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Interviews.

    list:     GET  /api/interviews/        — paginated list
    create:   POST /api/interviews/        — schedule an interview (HR/Admin)
    retrieve: GET  /api/interviews/{id}/   — full detail with participants & evaluations
    update:   PUT  /api/interviews/{id}/   — update interview (HR/Admin)
    destroy:  DELETE /api/interviews/{id}/ — delete interview (HR/Admin)

    Custom action:
        POST /api/interviews/{id}/add-participant/ — add a user to the interview
    """
    queryset = Interview.objects.select_related(
        'application',
        'application__candidate',
        'application__job',
    ).prefetch_related(
        'participants',
        'evaluations',
        'evaluations__evaluator',
    ).all()

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['application']
    ordering_fields = ['scheduled_date']
    ordering = ['-scheduled_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return InterviewListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return InterviewWriteSerializer
        return InterviewDetailSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'add_participant']:
            return [IsAuthenticated(), IsHRManagerOrAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], url_path='add-participant')
    def add_participant(self, request, pk=None):
        """
        POST /api/interviews/{id}/add-participant/
        Adds a single user to the interview participants.
        Body: { "user_id": 5 }
        """
        from apps.accounts.models import User
        from .models import InterviewParticipant

        interview = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'detail': 'user_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': f'User with id {user_id} not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        participant, created = InterviewParticipant.objects.get_or_create(
            interview=interview,
            user=user
        )

        if not created:
            return Response(
                {'detail': f'{user.get_full_name()} is already a participant.'},
                status=status.HTTP_200_OK
            )

        logger.info(
            f'[Interviews] {user.email} added to interview {interview.id} '
            f'by {request.user.email}'
        )

        return Response(
            {'detail': f'{user.get_full_name()} added successfully.'},
            status=status.HTTP_201_CREATED
        )


class EvaluationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Interview Evaluations.

    list:   GET  /api/evaluations/        — list all evaluations
    create: POST /api/evaluations/        — submit an evaluation
    retrieve: GET /api/evaluations/{id}/  — single evaluation detail
    update: PATCH /api/evaluations/{id}/  — update own evaluation
    """
    queryset = Evaluation.objects.select_related(
        'interview',
        'evaluator',
    ).all()

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['interview']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return EvaluationWriteSerializer
        return EvaluationSerializer

    def get_permissions(self):
        return [IsAuthenticated()]
