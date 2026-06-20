from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'templates', views.MessageTemplateViewSet, basename='template')
router.register(r'communications', views.CommunicationsLogViewSet, basename='communication')

urlpatterns = [
    path('', include(router.urls)),
]
