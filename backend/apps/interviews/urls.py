from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'interviews', views.InterviewViewSet, basename='interview')
router.register(r'evaluations', views.EvaluationViewSet, basename='evaluation')

urlpatterns = [
    path('', include(router.urls)),
]
