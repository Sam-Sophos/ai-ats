from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Candidate
from .serializers import CandidateSerializer, CandidateWriteSerializer
from apps.accounts.permissions import IsHRManagerOrAdmin


class CandidateViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Candidates.

    list:     GET  /api/candidates/        — paginated list of all candidates
    create:   POST /api/candidates/        — register a new candidate
    retrieve: GET  /api/candidates/{id}/   — full candidate profile
    update:   PUT  /api/candidates/{id}/   — update candidate info
    partial_update: PATCH /api/candidates/{id}/ — partial update
    destroy:  DELETE /api/candidates/{id}/ — delete candidate (Admin only)
    """
    queryset = Candidate.objects.all()
    permission_classes = [IsAuthenticated]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['last_name', 'first_name', 'email']
    ordering = ['last_name', 'first_name']

    def get_serializer_class(self):
        """Use write serializer for mutations, read serializer for queries."""
        if self.action in ['create', 'update', 'partial_update']:
            return CandidateWriteSerializer
        return CandidateSerializer

    def get_permissions(self):
        """
        list and retrieve are open to any authenticated user.
        destroy requires HR Manager or Admin.
        """
        if self.action == 'destroy':
            return [IsAuthenticated(), IsHRManagerOrAdmin()]
        return [IsAuthenticated()]
