from .base import *
from datetime import timedelta

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# In development, allow all origins for easier testing
CORS_ALLOW_ALL_ORIGINS = True

# Show emails in the terminal instead of sending them
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Longer-lived JWT access tokens in development, so the silent-refresh
# 401s don't keep firing while testing. Production keeps the strict
# 15-minute value from base.py untouched.
SIMPLE_JWT = {
    **SIMPLE_JWT,
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
}