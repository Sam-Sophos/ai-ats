from django.db import models
from django.contrib.auth.hashers import make_password, check_password as check_password_hash


class Candidate(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)

    # Optional self-service account. Empty string = no account yet —
    # this candidate exists only because a recruiter added them manually.
    # A candidate "claims" their record by registering with this same email.
    password = models.CharField(max_length=128, blank=True, default='')

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

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        if not self.password:
            return False
        return check_password_hash(raw_password, self.password)

    @property
    def has_account(self):
        return bool(self.password)

    @property
    def is_authenticated(self):
        """
        Lets DRF's IsAuthenticated permission work transparently when
        request.user is set to a Candidate instance by our custom
        CandidateJWTAuthentication class below.
        """
        return True