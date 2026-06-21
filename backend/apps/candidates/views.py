from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from .models import Candidate
from .serializers import (
    CandidateSerializer,
    CandidateWriteSerializer,
    CandidateRegisterSerializer,
    CandidateLoginSerializer,
    get_tokens_for_candidate,
)
from .authentication import CandidateJWTAuthentication
from apps.accounts.permissions import IsHRManagerOrAdmin
from apps.applications.models import Application
from apps.applications.serializers import (
    ApplicationCreateSerializer,
    ApplicationListSerializer,
    ApplicationDetailSerializer,
)


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


# ─── Candidate self-service auth ──────────────────────────────────────────
# These endpoints are completely separate from the recruiter-side
# CandidateViewSet above. They authenticate against the Candidate table
# itself (via CandidateJWTAuthentication), not the recruiter User table.

@api_view(['POST'])
@permission_classes([AllowAny])
def candidate_register(request):
    """
    POST /api/candidate-auth/register/
    { first_name, last_name, email, phone, password }
    Creates a new candidate account, or "claims" an existing Candidate
    record (e.g. one a recruiter added manually) if the email matches.
    """
    serializer = CandidateRegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    candidate = serializer.save()
    tokens = get_tokens_for_candidate(candidate)
    return Response(
        {**tokens, 'candidate': CandidateSerializer(candidate).data},
        status=status.HTTP_201_CREATED
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def candidate_login(request):
    """
    POST /api/candidate-auth/login/
    { email, password } → { access, refresh, candidate }
    """
    serializer = CandidateLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    candidate = serializer.validated_data['candidate']
    tokens = get_tokens_for_candidate(candidate)
    return Response(
        {**tokens, 'candidate': CandidateSerializer(candidate).data},
        status=status.HTTP_200_OK
    )


@api_view(['GET'])
@authentication_classes([CandidateJWTAuthentication])
@permission_classes([IsAuthenticated])
def candidate_me(request):
    """
    GET /api/candidate-auth/me/
    Returns the logged-in candidate's own profile.
    """
    return Response(CandidateSerializer(request.user).data)


@api_view(['GET'])
@authentication_classes([CandidateJWTAuthentication])
@permission_classes([IsAuthenticated])
def my_applications(request):
    """
    GET /api/candidate-auth/my-applications/
    Returns only the logged-in candidate's own applications —
    never the full applications list.
    """
    applications = Application.objects.filter(
        candidate=request.user
    ).select_related('job', 'job__department')
    return Response(ApplicationListSerializer(applications, many=True).data)


@api_view(['POST'])
@authentication_classes([CandidateJWTAuthentication])
@permission_classes([IsAuthenticated])
def apply_to_job(request):
    """
    POST /api/candidate-auth/apply/
    multipart/form-data: { job, resume_file }
    The 'candidate' is always the logged-in candidate — never trusted
    from the request body, so one applicant can never apply as someone
    else's identity.
    """
    data = request.data.copy()
    data['candidate'] = request.user.id
    serializer = ApplicationCreateSerializer(data=data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    application = serializer.save()

    response_data = ApplicationDetailSerializer(application, context={'request': request}).data
    response_data['task_id'] = getattr(application, 'task_id', None)
    return Response(response_data, status=status.HTTP_202_ACCEPTED)