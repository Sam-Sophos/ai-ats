from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .dashboard import dashboard_stats

router = DefaultRouter()
router.register(r'applications', views.ApplicationViewSet, basename='application')
router.register(r'statuses', views.StatusViewSet, basename='status')
router.register(r'tasks', views.TaskStatusView, basename='task')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/stats/', dashboard_stats, name='dashboard-stats'),
]