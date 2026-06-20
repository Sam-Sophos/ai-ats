import os
from celery import Celery

# Tell Celery which Django settings file to use
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Create the Celery app instance
app = Celery('config')

# Load Celery configuration from Django settings
# All Celery settings in settings/base.py start with CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Automatically discover tasks.py files in all Django apps
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
