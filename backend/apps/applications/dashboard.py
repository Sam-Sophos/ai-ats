from django.db.models import Avg, Count, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.applications.models import Application, ApplicationStatusHistory
from apps.jobs.models import Job
from apps.interviews.models import Interview


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    GET /api/dashboard/stats/
    Returns pre-aggregated stats for the dashboard page.
    All numbers are exact totals from the database.
    """
    now = timezone.now()
    week_ago = now - timedelta(days=7)

    # Open jobs — all jobs (no status field, so all = open)
    open_jobs = Job.objects.count()

    # Applications submitted in the last 7 days
    applications_this_week = Application.objects.filter(
        applied_date__gte=week_ago
    ).count()

    # Average AI match score across all scored applications
    avg_score_result = Application.objects.filter(
        ai_match_score__isnull=False
    ).aggregate(avg=Avg('ai_match_score'))
    avg_score = round(avg_score_result['avg']) if avg_score_result['avg'] else None

    # Total interviews scheduled
    interviews_scheduled = Interview.objects.count()

    # Applications grouped by current status
    # Current status = latest status_history entry per application
    from django.db.models import OuterRef, Subquery
    from apps.applications.models import ApplicationStatusHistory

    latest_history = ApplicationStatusHistory.objects.filter(
        application=OuterRef('pk')
    ).order_by('-date_changed')

    applications_by_status = (
        Application.objects.annotate(
            current_status_name=Subquery(
                latest_history.values('status__status_name')[:1]
            )
        )
        .values('current_status_name')
        .annotate(count=Count('id'))
        .order_by('current_status_name')
    )

    status_breakdown = [
        {
            'status': item['current_status_name'] or 'Unknown',
            'count': item['count'],
        }
        for item in applications_by_status
    ]

    return Response({
        'open_jobs': open_jobs,
        'applications_this_week': applications_this_week,
        'avg_ai_match_score': avg_score,
        'interviews_scheduled': interviews_scheduled,
        'applications_by_status': status_breakdown,
    })
