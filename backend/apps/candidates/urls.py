from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'candidates', views.CandidateViewSet, basename='candidate')

urlpatterns = [
    path('', include(router.urls)),

    # Candidate self-service auth — separate from /api/auth/ (recruiter login)
    path('candidate-auth/register/', views.candidate_register, name='candidate-register'),
    path('candidate-auth/login/', views.candidate_login, name='candidate-login'),
    path('candidate-auth/refresh/', TokenRefreshView.as_view(), name='candidate-token-refresh'),
    path('candidate-auth/me/', views.candidate_me, name='candidate-me'),
    path('candidate-auth/my-applications/', views.my_applications, name='candidate-my-applications'),
    path('candidate-auth/apply/', views.apply_to_job, name='candidate-apply'),
]