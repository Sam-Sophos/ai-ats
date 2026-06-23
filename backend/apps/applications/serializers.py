from rest_framework import serializers
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
    Returns all nested objects plus computed AI match breakdown fields.
    """
    candidate = CandidateSerializer(read_only=True)
    job = JobListSerializer(read_only=True)
    extracted_skills = SkillSerializer(many=True, read_only=True)
    status_history = ApplicationStatusHistorySerializer(many=True, read_only=True)
    current_status = serializers.SerializerMethodField()
    offer = JobOfferSerializer(read_only=True)
    ai_log = AIProcessingLogSerializer(read_only=True)

    # AI Match Breakdown — computed, not stored
    matched_skills = serializers.SerializerMethodField()
    missing_skills = serializers.SerializerMethodField()
    additional_skills = serializers.SerializerMethodField()
    ai_breakdown_summary = serializers.SerializerMethodField()

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
            'matched_skills',
            'missing_skills',
            'additional_skills',
            'ai_breakdown_summary',
            'years_experience',
            'education_level',
        ]

    def get_current_status(self, obj):
        latest = obj.status_history.order_by('-date_changed').first()
        if latest:
            return StatusSerializer(latest.status).data
        return None

    def _get_skill_sets(self, obj):
        """
        Returns (job_skills, extracted_skills) as sets of (id, name) tuples.
        Cached on the serializer instance to avoid duplicate DB hits when
        multiple breakdown fields are computed for the same object.
        """
        cache_key = f'_skill_sets_{obj.id}'
        if not hasattr(self, cache_key):
            from apps.jobs.models import JobSkill
            job_skills = {
                (js.skill_id, js.skill.skill_name)
                for js in JobSkill.objects.filter(job=obj.job).select_related('skill')
            }
            extracted = {
                (s.id, s.skill_name)
                for s in obj.extracted_skills.all()
            }
            setattr(self, cache_key, (job_skills, extracted))
        return getattr(self, cache_key)

    def get_matched_skills(self, obj):
        job_skills, extracted = self._get_skill_sets(obj)
        job_ids = {s[0] for s in job_skills}
        ext_ids = {s[0] for s in extracted}
        matched_ids = job_ids & ext_ids
        return [
            {'id': sid, 'skill_name': name}
            for sid, name in job_skills
            if sid in matched_ids
        ]

    def get_missing_skills(self, obj):
        job_skills, extracted = self._get_skill_sets(obj)
        job_ids = {s[0] for s in job_skills}
        ext_ids = {s[0] for s in extracted}
        missing_ids = job_ids - ext_ids
        return [
            {'id': sid, 'skill_name': name}
            for sid, name in job_skills
            if sid in missing_ids
        ]

    def get_additional_skills(self, obj):
        job_skills, extracted = self._get_skill_sets(obj)
        job_ids = {s[0] for s in job_skills}
        return [
            {'id': sid, 'skill_name': name}
            for sid, name in extracted
            if sid not in job_ids
        ]

    def get_ai_breakdown_summary(self, obj):
        """
        Generates a natural-language explanation of the match score.
        No extra AI call — built from the computed breakdown data.
        """
        job_skills, extracted = self._get_skill_sets(obj)
        total = len(job_skills)
        job_ids = {s[0] for s in job_skills}
        ext_ids = {s[0] for s in extracted}
        matched_ids = job_ids & ext_ids
        missing_ids = job_ids - ext_ids
        additional_ids = ext_ids - job_ids

        matched_names = [name for sid, name in job_skills if sid in matched_ids]
        missing_names = [name for sid, name in job_skills if sid in missing_ids]
        additional_names = [name for sid, name in extracted if sid not in job_ids]

        score = obj.ai_match_score
        candidate_name = obj.candidate.get_full_name() if obj.candidate else 'This candidate'

        if total == 0:
            return (
                f"{candidate_name}'s application could not be scored against required skills "
                f"because no skills have been defined for this job posting. "
                f"Consider adding required skills to the job to enable AI matching."
            )

        matched_count = len(matched_names)
        missing_count = len(missing_names)
        additional_count = len(additional_names)

        # Opening sentence
        if score is None:
            summary = f"{candidate_name}'s resume has not been scored yet. "
        elif score >= 80:
            summary = f"{candidate_name} is a strong match, meeting {matched_count} of {total} required skill{'s' if total != 1 else ''}. "
        elif score >= 50:
            summary = f"{candidate_name} is a partial match, meeting {matched_count} of {total} required skill{'s' if total != 1 else ''}. "
        else:
            summary = f"{candidate_name} meets {matched_count} of {total} required skill{'s' if total != 1 else ''}, indicating a skills gap for this role. "

        # Matched skills sentence
        if matched_names:
            if len(matched_names) <= 4:
                summary += f"Confirmed strengths include {', '.join(matched_names[:-1])}{(' and ' + matched_names[-1]) if len(matched_names) > 1 else matched_names[0]}. "
            else:
                summary += f"Confirmed strengths include {', '.join(matched_names[:3])}, and {len(matched_names) - 3} more required skill{'s' if len(matched_names) - 3 != 1 else ''}. "

        # Missing skills sentence
        if missing_names:
            if len(missing_names) <= 3:
                summary += f"Primary gap{'s' if len(missing_names) > 1 else ''}: {', '.join(missing_names)}. "
            else:
                summary += f"Primary gaps include {', '.join(missing_names[:2])}, and {len(missing_names) - 2} other required skill{'s' if len(missing_names) - 2 != 1 else ''}. "

        # Additional skills sentence
        if additional_count > 0:
            if additional_count <= 4:
                summary += f"Additional strengths: {', '.join(additional_names[:additional_count])}."
            else:
                summary += f"The candidate also brings {additional_count} additional skills beyond the job requirements, including {', '.join(additional_names[:3])}."

        return summary.strip()


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
        """Enforce PDF only and 5MB max size."""
        if not value.name.endswith('.pdf'):
            raise serializers.ValidationError('Only PDF files are accepted.')
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('File size must not exceed 5MB.')
        return value

    def create(self, validated_data):
        from apps.applications.tasks import process_resume

        with transaction.atomic():
            # Save the application record
            application = Application.objects.create(**validated_data)

            # Create the first status history entry — 'Applied'
            try:
                applied_status = Status.objects.get(sequence_order=1)
                from apps.accounts.models import User
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