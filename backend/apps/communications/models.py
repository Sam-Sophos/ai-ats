from django.db import models
from apps.accounts.models import User
from apps.applications.models import Application


class MessageTemplate(models.Model):
    """
    Reusable email templates for automated communications.
    HR staff pick a template and the system fills in the
    candidate and job details automatically.
    """
    template_name = models.CharField(max_length=200, unique=True)
    email_subject = models.CharField(max_length=300)
    email_body = models.TextField()

    class Meta:
        db_table = 'message_templates'
        ordering = ['template_name']

    def __str__(self):
        return self.template_name


class CommunicationsLog(models.Model):
    """
    Immutable audit log of every email sent through the system.
    Records exactly what was sent, to whom, by whom, and when.
    """
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='communications'
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='sent_communications'
    )
    template = models.ForeignKey(
        MessageTemplate,
        on_delete=models.PROTECT,
        related_name='communications'
    )
    sent_date = models.DateTimeField(auto_now_add=True)
    message_content = models.TextField()

    class Meta:
        db_table = 'communications_log'
        ordering = ['-sent_date']
        indexes = [
            models.Index(fields=['application', 'sent_date']),
        ]

    def __str__(self):
        return f'{self.template} sent to {self.application.candidate} on {self.sent_date}'
