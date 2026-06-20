from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Authentication
    path('login/', views.LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Current user profile
    path('me/', views.me, name='me'),

    # Lookup endpoints
    path('users/', views.list_users, name='list_users'),
    path('roles/', views.list_roles, name='list_roles'),
    path('departments/', views.list_departments, name='list_departments'),
]
