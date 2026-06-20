from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User, Role, Department
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, RoleSerializer, DepartmentSerializer


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Accepts email and password.
    Returns access token, refresh token, and full user object.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """
    GET /api/auth/me/
    Returns the full profile of the currently logged-in user.
    Requires a valid JWT access token in the Authorization header.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """
    GET /api/auth/users/
    Returns a list of all users.
    Used by the frontend to populate participant selectors
    in the interview scheduler.
    """
    users = User.objects.select_related('role', 'department').all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_roles(request):
    """
    GET /api/auth/roles/
    Returns all available roles.
    """
    roles = Role.objects.all()
    serializer = RoleSerializer(roles, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_departments(request):
    """
    GET /api/auth/departments/
    Returns all departments.
    Used by the frontend for dropdown selectors.
    """
    departments = Department.objects.all()
    serializer = DepartmentSerializer(departments, many=True)
    return Response(serializer.data)
