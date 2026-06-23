from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.accounts.models import User
from apps.jobs.models import Job, Skill
from apps.candidates.models import Candidate


class Status(models.Model):
    status_name = models.CharField(max_length=100, unique=True)
    sequence_order = models.IntegerField(unique=True)

    class Meta:
        db_table = 'statuses'
        ordering = ['sequence_order']

    def __str__(self):
        return f'{self.sequence_order}. {self.status_name}'


class Application(models.Model):
    job = models.ForeignKey(
        Job,
        on_delete=models.PROTECT,
        related_name='applications'
    )
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.PROTECT,
        related_name='applications'
    )
    ai_match_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    applied_date = models.DateTimeField(auto_now_add=True)
    resume_file = models.FileField(upload_to='resumes/')

    # Experience & education — extracted by AI from the resume
    years_experience = models.FloatField(
        null=True,
        blank=True,
        help_text="Years of professional experience extracted from resume by AI."
    )
    education_level = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Highest education level extracted from resume by AI."
    )

    extracted_skills = models.ManyToManyField(
        Skill,
        through='ApplicationSkill',
        related_name='applications'
    )

    class Meta:
        db_table = 'applications'
        # Prevent a candidate from applying to the same job twice
        unique_together = [('job', 'candidate')]
        ordering = ['-applied_date']
        indexes = [
            models.Index(fields=['ai_match_score']),
            models.Index(fields=['job']),
            models.Index(fields=['candidate']),
        ]

    def __str__(self):
        return f'{self.candidate} → {self.job}'

    @property
    def current_status(self):
        """Returns the most recent status history entry."""
        return self.status_history.order_by('-date_changed').first()


class ApplicationSkill(models.Model):
    """
    Junction table linking applications to the skills
    extracted from the resume by the AI pipeline.
    This table is written by the AI — never by users directly.
    """
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='application_skills'
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='application_skills'
    )

    class Meta:
        db_table = 'application_skills'
        unique_together = [('application', 'skill')]

    def __str__(self):
        return f'{self.application} — {self.skill.skill_name}'


class ApplicationStatusHistory(models.Model):
    """
    Append-only audit log of every status change on an application.
    Records are NEVER updated or deleted — only inserted.
    The current status is always the most recent record.
    """
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    status = models.ForeignKey(
        Status,
        on_delete=models.PROTECT,
        related_name='history_entries'
    )
    changed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='status_changes'
    )
    date_changed = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'application_status_history'
        ordering = ['-date_changed']
        indexes = [
            models.Index(fields=['application', 'date_changed']),
        ]

    def __str__(self):
        return f'{self.application} → {self.status} at {self.date_changed}'


class JobOffer(models.Model):
    """One-to-one relationship: each application can have at most one offer."""
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name='offer'
    )
    salary_offered = models.DecimalField(max_digits=10, decimal_places=2)
    target_start_date = models.DateTimeField()
    is_accepted = models.BooleanField(null=True, blank=True)

    class Meta:
        db_table = 'job_offers'

    def __str__(self):
        return f'Offer for {self.application} — ${self.salary_offered}'


class AIProcessingLog(models.Model):
    """
    One-to-one log of the AI pipeline run for each application.
    Records token usage, processing time, and whether a human
    manually overrode the AI-generated score.
    """
    application = models.OneToOneField(
        Application,
        on_delete=models.CASCADE,
        related_name='ai_log'
    )
    tokens_used = models.IntegerField(default=0)
    processing_time_ms = models.IntegerField(default=0)
    human_override_applied = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_processing_logs'

    def __str__(self):
        return f'AI Log for {self.application} — {self.tokens_used} tokens'