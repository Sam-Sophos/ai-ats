from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from .models import Job, Skill
from .serializers import (
    JobListSerializer,
    JobDetailSerializer,
    JobWriteSerializer,
    SkillSerializer,
)
from apps.accounts.permissions import IsHRManagerOrAdmin


class JobViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Job Postings.

    list:   GET  /api/jobs/          — paginated list of all jobs
    create: POST /api/jobs/          — create a new job (HR/Admin only)
    retrieve: GET /api/jobs/{id}/    — full job detail with skills
    update: PUT  /api/jobs/{id}/     — update a job (HR/Admin only)
    partial_update: PATCH /api/jobs/{id}/ — partial update (HR/Admin only)
    destroy: DELETE /api/jobs/{id}/  — delete a job (HR/Admin only)
    """
    queryset = Job.objects.select_related(
        'department', 'created_by', 'created_by__role'
    ).prefetch_related('skills').all()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'list':
            return JobListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return JobWriteSerializer
        return JobDetailSerializer

    def get_permissions(self):
        """
        list and retrieve are public — anyone can browse open jobs.
        create, update, destroy require HR Manager or Admin.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsHRManagerOrAdmin()]
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]


class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for Skills.
    Read-only — skills are created automatically by the AI pipeline
    or can be managed via the admin panel.

    list:     GET /api/skills/       — list all skills (supports ?search=)
    retrieve: GET /api/skills/{id}/  — single skill detail
    """
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['skill_name']
    ordering_fields = ['skill_name']
    ordering = ['skill_name']
