from django.db import models


class Candidate(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'candidates'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.email})'

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'
