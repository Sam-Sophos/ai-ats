from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Role, Department


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'title']


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name']


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'role',
            'department',
            'date_joined',
        ]
        read_only_fields = ['date_joined']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to inject extra user data
    into the token payload and the login response.
    The frontend reads role and department_id directly from the
    token — no extra API call needed after login.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Inject custom claims into the JWT payload
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['role'] = user.role.title if user.role else None
        token['department_id'] = user.department.id if user.department else None

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Append full user object to the login response body
        data['user'] = UserSerializer(self.user).data

        return data
