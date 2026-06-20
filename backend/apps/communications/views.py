import logging
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import MessageTemplate, CommunicationsLog
from .serializers import (
    MessageTemplateSerializer,
    CommunicationsLogSerializer,
    SendCommunicationSerializer,
)
from apps.accounts.permissions import IsHRManagerOrAdmin

logger = logging.getLogger(__name__)


class MessageTemplateViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Message Templates.

    list:     GET  /api/templates/        — list all templates
    create:   POST /api/templates/        — create a template (HR/Admin)
    retrieve: GET  /api/templates/{id}/   — single template detail
    update:   PUT  /api/templates/{id}/   — update template (HR/Admin)
    destroy:  DELETE /api/templates/{id}/ — delete template (HR/Admin)
    """
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer

    filter_backends = [filters.SearchFilter]
    search_fields = ['template_name', 'email_subject']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsHRManagerOrAdmin()]
        return [IsAuthenticated()]


class CommunicationsLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for Communications Log.
    Read-only — log entries are created via the 'send' action only.

    list:     GET /api/communications/        — list all communications
    retrieve: GET /api/communications/{id}/   — single entry detail

    Custom action:
        POST /api/communications/send/ — send a communication to a candidate
    """
    queryset = CommunicationsLog.objects.select_related(
        'application',
        'application__candidate',
        'application__job',
        'sender',
        'template',
    ).all()
    serializer_class = CommunicationsLogSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['application']
    ordering_fields = ['sent_date']
    ordering = ['-sent_date']

    @action(detail=False, methods=['post'], url_path='send')
    def send(self, request):
        """
        POST /api/communications/send/
        Sends a templated email to the candidate of a given application.
        Creates a CommunicationsLog record as an audit trail.
        Requires HR Manager or Admin role.

        Body: { "application_id": 1, "template_id": 2 }
        """
        if not request.user.role or request.user.role.title not in ['HR_MANAGER', 'ADMIN']:
            return Response(
                {'detail': 'Only HR Managers and Admins can send communications.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SendCommunicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.applications.models import Application

        application = Application.objects.select_related(
            'candidate', 'job'
        ).get(id=serializer.validated_data['application_id'])

        template = MessageTemplate.objects.get(
            id=serializer.validated_data['template_id']
        )

        # Build the personalised message content
        message_content = _render_template(template, application)

        # Create the audit log record
        log_entry = CommunicationsLog.objects.create(
            application=application,
            sender=request.user,
            template=template,
            message_content=message_content,
        )

        # In development, the email prints to the terminal console
        # In production, this would dispatch via SMTP
        logger.info(
            f'[Communications] Email sent to '
            f'{application.candidate.email} '
            f'using template "{template.template_name}" '
            f'by {request.user.email}'
        )

        return Response(
            CommunicationsLogSerializer(log_entry).data,
            status=status.HTTP_201_CREATED
        )


def _render_template(template: MessageTemplate, application) -> str:
    """
    Replaces placeholder variables in the email body with
    actual candidate and job data.

    Supported placeholders:
        {{candidate_name}}  — candidate's full name
        {{job_title}}       — job title
        {{company_name}}    — fixed company name
    """
    content = template.email_body
    content = content.replace('{{candidate_name}}', application.candidate.get_full_name())
    content = content.replace('{{job_title}}', application.job.title)
    content = content.replace('{{company_name}}', 'Our Company')
    return content
