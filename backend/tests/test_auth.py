import pytest
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, Role, Department


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    role = Role.objects.create(title='HR_MANAGER')
    department = Department.objects.create(name='Engineering')
    user = User.objects.create_user(
        email='hrtest@example.com',
        password='securepass123',
        first_name='HR',
        last_name='Tester',
        role=role,
        department=department,
    )
    return user


@pytest.mark.django_db
class TestLogin:
    def test_login_with_valid_credentials_succeeds(self, api_client, test_user):
        """A correct email/password pair returns access and refresh tokens."""
        response = api_client.post('/api/auth/login/', {
            'email': 'hrtest@example.com',
            'password': 'securepass123',
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
        assert response.data['user']['email'] == 'hrtest@example.com'

    def test_login_with_wrong_password_fails(self, api_client, test_user):
        """An incorrect password is rejected with 401."""
        response = api_client.post('/api/auth/login/', {
            'email': 'hrtest@example.com',
            'password': 'wrongpassword',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_with_nonexistent_email_fails(self, api_client):
        """Logging in with an email that doesn't exist is rejected."""
        response = api_client.post('/api/auth/login/', {
            'email': 'doesnotexist@example.com',
            'password': 'anypassword',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_with_inactive_user_fails(self, api_client, test_user):
        """An inactive user cannot log in even with correct credentials."""
        test_user.is_active = False
        test_user.save()

        response = api_client.post('/api/auth/login/', {
            'email': 'hrtest@example.com',
            'password': 'securepass123',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_jwt_token_contains_role_and_department(self, api_client, test_user):
        """The custom serializer injects role and department_id into the JWT."""
        import jwt
        from django.conf import settings

        response = api_client.post('/api/auth/login/', {
            'email': 'hrtest@example.com',
            'password': 'securepass123',
        })
        access_token = response.data['access']
        decoded = jwt.decode(access_token, options={'verify_signature': False})

        assert decoded['role'] == 'HR_MANAGER'
        assert decoded['department_id'] == test_user.department.id


@pytest.mark.django_db
class TestMeEndpoint:
    def test_me_without_token_is_rejected(self, api_client):
        """Calling /me/ without a token returns 401."""
        response = api_client.get('/api/auth/me/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_with_valid_token_returns_profile(self, api_client, test_user):
        """Calling /me/ with a valid token returns the user's own profile."""
        login_response = api_client.post('/api/auth/login/', {
            'email': 'hrtest@example.com',
            'password': 'securepass123',
        })
        access_token = login_response.data['access']

        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = api_client.get('/api/auth/me/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == 'hrtest@example.com'

    def test_me_with_invalid_token_is_rejected(self, api_client):
        """An obviously fake token is rejected."""
        api_client.credentials(HTTP_AUTHORIZATION='Bearer not.a.real.token')
        response = api_client.get('/api/auth/me/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenRefresh:
    def test_refresh_token_returns_new_access_token(self, api_client, test_user):
        """A valid refresh token produces a new access token."""
        login_response = api_client.post('/api/auth/login/', {
            'email': 'hrtest@example.com',
            'password': 'securepass123',
        })
        refresh_token = login_response.data['refresh']

        response = api_client.post('/api/auth/refresh/', {
            'refresh': refresh_token,
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
