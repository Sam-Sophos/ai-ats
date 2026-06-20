import io
import pytest
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User, Role, Department
from apps.jobs.models import Job, Skill, JobSkill
from apps.candidates.models import Candidate
from apps.applications.models import Application, Status, AIProcessingLog


# A minimal valid PDF — starts with the %PDF- magic bytes our
# validator checks for, so it passes file-content validation.
MINIMAL_PDF_BYTES = (
    b'%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n'
    b'trailer<</Root 1 0 R>>\n%%EOF'
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def hr_user(db):
    role, _ = Role.objects.get_or_create(title='HR_MANAGER')
    department, _ = Department.objects.get_or_create(name='Engineering')
    return User.objects.create_user(
        email='hr@example.com',
        password='pass123',
        first_name='HR',
        last_name='Manager',
        role=role,
        department=department,
    )


@pytest.fixture
def interviewer_user(db):
    role, _ = Role.objects.get_or_create(title='INTERVIEWER')
    department, _ = Department.objects.get_or_create(name='Engineering')
    return User.objects.create_user(
        email='interviewer@example.com',
        password='pass123',
        first_name='Inter',
        last_name='Viewer',
        role=role,
        department=department,
    )


@pytest.fixture
def authenticated_hr_client(api_client, hr_user):
    api_client.force_authenticate(user=hr_user)
    return api_client


@pytest.fixture
def authenticated_interviewer_client(api_client, interviewer_user):
    api_client.force_authenticate(user=interviewer_user)
    return api_client


@pytest.fixture
def sample_job(hr_user, db):
    department = Department.objects.first() or Department.objects.create(name='Engineering')
    job = Job.objects.create(
        title='Backend Engineer',
        description='Test job',
        department=department,
        created_by=hr_user,
    )
    skill = Skill.objects.create(skill_name='Python')
    JobSkill.objects.create(job=job, skill=skill)
    return job


@pytest.fixture
def sample_candidate(db):
    return Candidate.objects.create(
        first_name='John',
        last_name='Doe',
        email='john.doe@example.com',
        phone='1234567890',
    )


@pytest.fixture
def sample_statuses(db):
    applied = Status.objects.create(status_name='Applied', sequence_order=1)
    screening = Status.objects.create(status_name='Screening', sequence_order=2)
    rejected = Status.objects.create(status_name='Rejected', sequence_order=3)
    return {'applied': applied, 'screening': screening, 'rejected': rejected}


@pytest.mark.django_db
class TestApplicationCreate:
    @patch('apps.applications.tasks.process_resume.delay')
    def test_create_application_triggers_ai_task(
        self, mock_delay, authenticated_hr_client, sample_job, sample_candidate
    ):
        """Submitting an application dispatches the Celery AI task."""
        mock_delay.return_value.id = 'fake-task-id-123'

        resume = SimpleUploadedFile(
            'resume.pdf', MINIMAL_PDF_BYTES, content_type='application/pdf'
        )
        response = authenticated_hr_client.post('/api/applications/', {
            'job': sample_job.id,
            'candidate': sample_candidate.id,
            'resume_file': resume,
        }, format='multipart')

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data['task_id'] == 'fake-task-id-123'
        mock_delay.assert_called_once()

    @patch('apps.applications.tasks.process_resume.delay')
    def test_create_application_creates_initial_status_history(
        self, mock_delay, authenticated_hr_client, sample_job, sample_candidate, sample_statuses
    ):
        """A new application automatically gets an 'Applied' status record."""
        mock_delay.return_value.id = 'fake-task-id'

        resume = SimpleUploadedFile(
            'resume.pdf', MINIMAL_PDF_BYTES, content_type='application/pdf'
        )
        response = authenticated_hr_client.post('/api/applications/', {
            'job': sample_job.id,
            'candidate': sample_candidate.id,
            'resume_file': resume,
        }, format='multipart')

        application = Application.objects.get(id=response.data['id'])
        assert application.status_history.count() == 1
        assert application.status_history.first().status.status_name == 'Applied'

    def test_create_application_rejects_non_pdf_file(
        self, authenticated_hr_client, sample_job, sample_candidate
    ):
        """Uploading a non-PDF file is rejected by validation."""
        fake_file = SimpleUploadedFile(
            'resume.txt', b'not a pdf at all', content_type='text/plain'
        )
        response = authenticated_hr_client.post('/api/applications/', {
            'job': sample_job.id,
            'candidate': sample_candidate.id,
            'resume_file': fake_file,
        }, format='multipart')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_application_rejects_fake_pdf_extension(
        self, authenticated_hr_client, sample_job, sample_candidate
    ):
        """
        A file renamed to '.pdf' but without real PDF magic bytes
        is rejected by the content-sniffing check.
        """
        fake_pdf = SimpleUploadedFile(
            'resume.pdf', b'this is just text, not a real pdf',
            content_type='application/pdf'
        )
        response = authenticated_hr_client.post('/api/applications/', {
            'job': sample_job.id,
            'candidate': sample_candidate.id,
            'resume_file': fake_pdf,
        }, format='multipart')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_duplicate_application_is_rejected(
        self, authenticated_hr_client, sample_job, sample_candidate
    ):
        """Applying to the same job twice with the same candidate fails."""
        Application.objects.create(
            job=sample_job,
            candidate=sample_candidate,
            resume_file='resumes/existing.pdf',
        )

        resume = SimpleUploadedFile(
            'resume.pdf', MINIMAL_PDF_BYTES, content_type='application/pdf'
        )
        response = authenticated_hr_client.post('/api/applications/', {
            'job': sample_job.id,
            'candidate': sample_candidate.id,
            'resume_file': resume,
        }, format='multipart')

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestMoveStatus:
    def test_hr_can_move_status(
        self, authenticated_hr_client, sample_job, sample_candidate, sample_statuses
    ):
        """HR Manager can move an application to a new pipeline stage."""
        application = Application.objects.create(
            job=sample_job, candidate=sample_candidate,
            resume_file='resumes/test.pdf',
        )
        response = authenticated_hr_client.patch(
            f'/api/applications/{application.id}/move-status/',
            {'status_id': sample_statuses['screening'].id},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert application.status_history.count() == 1
        assert application.status_history.first().status == sample_statuses['screening']

    def test_interviewer_cannot_move_status(
        self, authenticated_interviewer_client, sample_job, sample_candidate, sample_statuses
    ):
        """A plain interviewer is blocked from moving pipeline stages."""
        application = Application.objects.create(
            job=sample_job, candidate=sample_candidate,
            resume_file='resumes/test.pdf',
        )
        response = authenticated_interviewer_client.patch(
            f'/api/applications/{application.id}/move-status/',
            {'status_id': sample_statuses['screening'].id},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_move_status_with_invalid_status_id_fails(
        self, authenticated_hr_client, sample_job, sample_candidate
    ):
        """Providing a status_id that doesn't exist returns a validation error."""
        application = Application.objects.create(
            job=sample_job, candidate=sample_candidate,
            resume_file='resumes/test.pdf',
        )
        response = authenticated_hr_client.patch(
            f'/api/applications/{application.id}/move-status/',
            {'status_id': 99999},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestOverrideScore:
    def test_hr_can_override_score(
        self, authenticated_hr_client, sample_job, sample_candidate
    ):
        """HR can manually override the AI-generated match score."""
        application = Application.objects.create(
            job=sample_job, candidate=sample_candidate,
            resume_file='resumes/test.pdf', ai_match_score=50,
        )
        response = authenticated_hr_client.patch(
            f'/api/applications/{application.id}/override-score/',
            {'ai_match_score': 85},
        )
        assert response.status_code == status.HTTP_200_OK
        application.refresh_from_db()
        assert application.ai_match_score == 85

        log = AIProcessingLog.objects.get(application=application)
        assert log.human_override_applied is True

    def test_interviewer_cannot_override_score(
        self, authenticated_interviewer_client, sample_job, sample_candidate
    ):
        """A plain interviewer cannot override the AI score."""
        application = Application.objects.create(
            job=sample_job, candidate=sample_candidate,
            resume_file='resumes/test.pdf', ai_match_score=50,
        )
        response = authenticated_interviewer_client.patch(
            f'/api/applications/{application.id}/override-score/',
            {'ai_match_score': 85},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_override_score_rejects_out_of_range_value(
        self, authenticated_hr_client, sample_job, sample_candidate
    ):
        """A score above 100 or below 0 is rejected."""
        application = Application.objects.create(
            job=sample_job, candidate=sample_candidate,
            resume_file='resumes/test.pdf',
        )
        response = authenticated_hr_client.patch(
            f'/api/applications/{application.id}/override-score/',
            {'ai_match_score': 150},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestResumeAccess:
    def test_authenticated_user_can_access_resume(
        self, authenticated_hr_client, sample_job, sample_candidate
    ):
        """An authenticated user can stream the resume file."""
        resume = SimpleUploadedFile(
            'resume.pdf', MINIMAL_PDF_BYTES, content_type='application/pdf'
        )
        application = Application.objects.create(
            job=sample_job, candidate=sample_candidate,
            resume_file=resume,
        )
        response = authenticated_hr_client.get(
            f'/api/applications/{application.id}/resume/'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/pdf'

    def test_unauthenticated_user_cannot_access_resume(
        self, api_client, sample_job, sample_candidate
    ):
        """An unauthenticated request to the resume endpoint is rejected."""
        resume = SimpleUploadedFile(
            'resume.pdf', MINIMAL_PDF_BYTES, content_type='application/pdf'
        )
        application = Application.objects.create(
            job=sample_job, candidate=sample_candidate,
            resume_file=resume,
        )
        response = api_client.get(
            f'/api/applications/{application.id}/resume/'
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED