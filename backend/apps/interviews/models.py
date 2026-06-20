from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.accounts.models import User
from apps.applications.models import Application


class Interview(models.Model):
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='interviews'
    )
    scheduled_date = models.DateTimeField()
    meeting_link = models.URLField(blank=True)
    participants = models.ManyToManyField(
        User,
        through='InterviewParticipant',
        related_name='interviews'
    )

    class Meta:
        db_table = 'interviews'
        ordering = ['-scheduled_date']

    def __str__(self):
        return f'Interview for {self.application} on {self.scheduled_date}'


class InterviewParticipant(models.Model):
    """
    Junction table linking interviewers (Users) to Interviews.
    Explicit through model allows future extension
    (e.g. adding a 'role' field like 'lead interviewer').
    """
    interview = models.ForeignKey(
        Interview,
        on_delete=models.CASCADE,
        related_name='interview_participants'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='interview_slots'
    )

    class Meta:
        db_table = 'interview_participants'
        unique_together = [('interview', 'user')]

    def __str__(self):
        return f'{self.user} in {self.interview}'


class Evaluation(models.Model):
    interview = models.ForeignKey(
        Interview,
        on_delete=models.CASCADE,
        related_name='evaluations'
    )
    evaluator = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='evaluations'
    )
    score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(10)]
    )
    written_feedback = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'evaluations'
        ordering = ['-created_at']
        # One evaluation per evaluator per interview
        unique_together = [('interview', 'evaluator')]

    def __str__(self):
        return f'Evaluation by {self.evaluator} — score: {self.score}/10'
