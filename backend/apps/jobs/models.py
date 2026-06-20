from django.db import models
from apps.accounts.models import User, Department


class Skill(models.Model):
    skill_name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'skills'
        ordering = ['skill_name']
        indexes = [
            models.Index(fields=['skill_name']),
        ]

    def __str__(self):
        return self.skill_name


class Job(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name='jobs'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_jobs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    skills = models.ManyToManyField(
        Skill,
        through='JobSkill',
        related_name='jobs'
    )

    class Meta:
        db_table = 'jobs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['department']),
            models.Index(fields=['created_by']),
        ]

    def __str__(self):
        return f'{self.title} ({self.department})'


class JobSkill(models.Model):
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='job_skills'
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.CASCADE,
        related_name='job_skills'
    )

    class Meta:
        db_table = 'job_skills'
        unique_together = [('job', 'skill')]

    def __str__(self):
        return f'{self.job.title} — {self.skill.skill_name}'
