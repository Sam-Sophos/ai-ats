import time
import logging
from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_resume(self, application_id: int):
    """
    The core AI pipeline task. Triggered automatically when a new
    application is submitted with a resume file.

    Steps:
    1. Load the application from the database
    2. Extract text from the PDF resume
    3. Send the text to the AI API (Gemini or Groq)
    4. Match extracted skills against the job's required skills
    5. Calculate and save the ai_match_score
    6. Create the AIProcessingLog record
    """
    from apps.applications.models import Application, AIProcessingLog
    from services.resume_parser import extract_text_from_pdf
    from services.ai_service import get_ai_provider
    from services.matching_service import match_and_score

    logger.info(f'[AI Pipeline] Starting processing for application {application_id}')

    try:
        # Step 1 — Load the application
        try:
            application = Application.objects.select_related('job').get(id=application_id)
        except Application.DoesNotExist:
            logger.error(f'[AI Pipeline] Application {application_id} not found.')
            return {'status': 'FAILURE', 'reason': 'Application not found'}

        # Step 2 — Extract text from the PDF resume
        logger.info(f'[AI Pipeline] Extracting text from resume for application {application_id}')
        try:
            resume_text = extract_text_from_pdf(application.resume_file.path)
        except Exception as e:
            logger.error(f'[AI Pipeline] PDF extraction failed: {e}')
            _create_failed_log(application)
            return {'status': 'FAILURE', 'reason': f'PDF extraction failed: {str(e)}'}

        # Step 3 — Call the AI API
        logger.info(f'[AI Pipeline] Sending resume to AI provider for application {application_id}')
        start_time = time.time()
        try:
            provider = get_ai_provider()
            ai_result = provider.extract_skills(resume_text)
        except Exception as e:
            logger.error(f'[AI Pipeline] AI API call failed: {e}')
            # Retry up to 3 times with a 60-second delay
            raise self.retry(exc=e, countdown=60)

        processing_time_ms = int((time.time() - start_time) * 1000)
        tokens_used = ai_result.get('tokens_used', 0)
        extracted_skills = ai_result.get('extracted_skills', [])

        logger.info(
            f'[AI Pipeline] AI returned {len(extracted_skills)} skills '
            f'in {processing_time_ms}ms using {tokens_used} tokens '
            f'for application {application_id}'
        )

        # Step 4 & 5 — Match skills and calculate score
        score = match_and_score(application_id, extracted_skills)

        # Step 6 — Create the AI processing log
        with transaction.atomic():
            AIProcessingLog.objects.update_or_create(
                application=application,
                defaults={
                    'tokens_used': tokens_used,
                    'processing_time_ms': processing_time_ms,
                    'human_override_applied': False,
                }
            )

        logger.info(
            f'[AI Pipeline] Completed for application {application_id}. '
            f'Score: {score}/100'
        )

        return {
            'status': 'SUCCESS',
            'application_id': application_id,
            'ai_match_score': score,
            'extracted_skills': extracted_skills,
            'tokens_used': tokens_used,
            'processing_time_ms': processing_time_ms,
        }

    except Exception as exc:
        # If all retries are exhausted, log the failure
        if self.request.retries >= self.max_retries:
            logger.error(
                f'[AI Pipeline] All retries exhausted for application {application_id}: {exc}'
            )
            try:
                application = Application.objects.get(id=application_id)
                _create_failed_log(application)
            except Application.DoesNotExist:
                pass
        raise


def _create_failed_log(application):
    """Helper to create a failed AIProcessingLog record."""
    from apps.applications.models import AIProcessingLog
    AIProcessingLog.objects.update_or_create(
        application=application,
        defaults={
            'tokens_used': 0,
            'processing_time_ms': 0,
            'human_override_applied': False,
        }
    )
