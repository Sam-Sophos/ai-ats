from rest_framework import serializers
from apps.accounts.models import User
from django.db import transaction
from .models import (
    Application,
    ApplicationSkill,
    ApplicationStatusHistory,
    Status,
    JobOffer,
    AIProcessingLog,
)
from apps.jobs.serializers import JobListSerializer, SkillSerializer
from apps.candidates.serializers import CandidateSerializer
from apps.accounts.serializers import UserSerializer


class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = ['id', 'status_name', 'sequence_order']


class AIProcessingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIProcessingLog
        fields = [
            'id',
            'tokens_used',
            'processing_time_ms',
            'human_override_applied',
            'created_at',
        ]


class JobOfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobOffer
        fields = [
            'id',
            'salary_offered',
            'target_start_date',
            'is_accepted',
        ]

    def validate_salary_offered(self, value):
        if value <= 0:
            raise serializers.ValidationError('Salary must be greater than zero.')
        return value


class ApplicationStatusHistorySerializer(serializers.ModelSerializer):
    status = StatusSerializer(read_only=True)
    changed_by = UserSerializer(read_only=True)

    class Meta:
        model = ApplicationStatusHistory
        fields = [
            'id',
            'status',
            'changed_by',
            'date_changed',
        ]


class ApplicationListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views.
    Returns only what the applications table needs.
    """
    candidate_name = serializers.CharField(
        source='candidate.get_full_name',
        read_only=True
    )
    job_title = serializers.CharField(
        source='job.title',
        read_only=True
    )
    current_status = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id',
            'candidate_name',
            'job_title',
            'ai_match_score',
            'current_status',
            'applied_date',
        ]

    def get_current_status(self, obj):
        latest = obj.status_history.order_by('-date_changed').first()
        if latest:
            return StatusSerializer(latest.status).data
        return None


class ApplicationDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for the application detail page.
    Returns all nested objects.
    """
    candidate = CandidateSerializer(read_only=True)
    job = JobListSerializer(read_only=True)
    extracted_skills = SkillSerializer(many=True, read_only=True)
    status_history = ApplicationStatusHistorySerializer(many=True, read_only=True)
    current_status = serializers.SerializerMethodField()
    offer = JobOfferSerializer(read_only=True)
    ai_log = AIProcessingLogSerializer(read_only=True)

    class Meta:
        model = Application
        fields = [
            'id',
            'candidate',
            'job',
            'ai_match_score',
            'applied_date',
            'resume_file',
            'extracted_skills',
            'current_status',
            'status_history',
            'offer',
            'ai_log',
        ]

    def get_current_status(self, obj):
        latest = obj.status_history.order_by('-date_changed').first()
        if latest:
            return StatusSerializer(latest.status).data
        return None


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting a new application.
    Accepts job_id, candidate_id, and resume_file.
    On create: saves the application, creates the first
    status history record, and triggers the AI pipeline task.
    """
    class Meta:
        model = Application
        fields = [
            'id',
            'job',
            'candidate',
            'resume_file',
            'applied_date',
        ]
        read_only_fields = ['applied_date']

    def validate_resume_file(self, value):
        """
        Enforce PDF only and 5MB max size.
        Checks both the file extension AND the actual content-type
        header AND the magic bytes at the start of the file, since
        a malicious user could rename any file to '.pdf'.
        """
        # Check 1 — file extension
        if not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError('Only PDF files are accepted.')

        # Check 2 — declared content type from the upload
        allowed_content_types = ['application/pdf']
        if value.content_type not in allowed_content_types:
            raise serializers.ValidationError(
                'Invalid file type. Only PDF files are accepted.'
            )

        # Check 3 — file size limit (5MB)
        max_size_bytes = 5 * 1024 * 1024
        if value.size > max_size_bytes:
            raise serializers.ValidationError(
                f'File size must not exceed 5MB. '
                f'Your file is {round(value.size / 1024 / 1024, 2)}MB.'
            )

        # Check 4 — magic bytes: real PDFs start with %PDF-
        value.seek(0)
        header = value.read(5)
        value.seek(0)
        if header != b'%PDF-':
            raise serializers.ValidationError(
                'This file does not appear to be a valid PDF.'
            )

        return value

    def create(self, validated_data):
        from apps.applications.tasks import process_resume

        with transaction.atomic():
            # Save the application record
            application = Application.objects.create(**validated_data)

            # Create the first status history entry — 'Applied'
            try:
                applied_status = Status.objects.get(sequence_order=1)
                request_user = self.context['request'].user
                changed_by = request_user if isinstance(request_user, User) else None
                ApplicationStatusHistory.objects.create(
                    application=application,
                    status=applied_status,
                    changed_by=changed_by,
                )
            except Status.DoesNotExist:
                pass

        # Trigger the AI pipeline as a background task
        # This runs outside the transaction so the application
        # is already saved before the task tries to read it
        task = process_resume.delay(application.id)

        # Attach the task_id so the view can return it to the frontend
        application.task_id = task.id

        return application


class MoveStatusSerializer(serializers.Serializer):
    """Serializer for the move-status action."""
    status_id = serializers.IntegerField()

    def validate_status_id(self, value):
        if not Status.objects.filter(id=value).exists():
            raise serializers.ValidationError('Invalid status ID.')
        return value


class OverrideScoreSerializer(serializers.Serializer):
    """Serializer for the override-score action."""
    ai_match_score = serializers.IntegerField(min_value=0, max_value=100)
