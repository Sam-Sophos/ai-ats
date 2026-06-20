import pytest
from unittest.mock import patch, MagicMock

from apps.accounts.models import User, Department
from apps.jobs.models import Job, Skill, JobSkill
from apps.candidates.models import Candidate
from apps.applications.models import Application, ApplicationSkill, AIProcessingLog
from apps.applications.tasks import process_resume
from services.resume_parser import extract_text_from_pdf, ResumeParseError
from services.matching_service import match_and_score


@pytest.fixture
def hr_user(db):
    department, _ = Department.objects.get_or_create(name='Engineering')
    return User.objects.create_user(
        email='pipeline_hr@example.com',
        password='pass123',
        first_name='HR',
        last_name='Person',
    )


@pytest.fixture
def job_with_skills(hr_user, db):
    department = Department.objects.first()
    job = Job.objects.create(
        title='Full Stack Developer',
        description='Test job',
        department=department,
        created_by=hr_user,
    )
    python_skill = Skill.objects.create(skill_name='Python')
    django_skill = Skill.objects.create(skill_name='Django')
    react_skill = Skill.objects.create(skill_name='React')
    JobSkill.objects.create(job=job, skill=python_skill)
    JobSkill.objects.create(job=job, skill=django_skill)
    JobSkill.objects.create(job=job, skill=react_skill)
    return job


@pytest.fixture
def candidate(db):
    return Candidate.objects.create(
        first_name='Pipeline',
        last_name='Test',
        email='pipeline.test@example.com',
        phone='1234567890',
    )


@pytest.fixture
def application_with_resume(job_with_skills, candidate, db):
    return Application.objects.create(
        job=job_with_skills,
        candidate=candidate,
        resume_file='resumes/fake_test_resume.pdf',
    )


@pytest.mark.django_db
class TestMatchingService:
    def test_full_skill_match_gives_100_score(self, application_with_resume):
        """If every required skill is found, the score is exactly 100."""
        extracted = ['Python', 'Django', 'React']
        score = match_and_score(application_with_resume.id, extracted)
        assert score == 100

    def test_partial_skill_match_gives_proportional_score(self, application_with_resume):
        """Matching 2 of 3 required skills gives a 67 score."""
        extracted = ['Python', 'Django', 'Cobol']
        score = match_and_score(application_with_resume.id, extracted)
        assert score == 67

    def test_no_skill_match_gives_zero_score(self, application_with_resume):
        """If none of the extracted skills match, score is 0."""
        extracted = ['Cobol', 'Fortran', 'Assembly']
        score = match_and_score(application_with_resume.id, extracted)
        assert score == 0

    def test_case_insensitive_skill_matching(self, application_with_resume):
        """'python' (lowercase) still matches the 'Python' skill record."""
        extracted = ['python', 'DJANGO', 'react']
        score = match_and_score(application_with_resume.id, extracted)
        assert score == 100

    def test_matching_creates_application_skill_records(self, application_with_resume):
        """The matching service writes ApplicationSkill junction records."""
        extracted = ['Python', 'Django']
        match_and_score(application_with_resume.id, extracted)

        skill_names = set(
            ApplicationSkill.objects.filter(
                application=application_with_resume
            ).values_list('skill__skill_name', flat=True)
        )
        assert 'Python' in skill_names
        assert 'Django' in skill_names

    def test_score_is_saved_to_application(self, application_with_resume):
        """The calculated score persists on the Application record."""
        match_and_score(application_with_resume.id, ['Python', 'Django', 'React'])
        application_with_resume.refresh_from_db()
        assert application_with_resume.ai_match_score == 100

    def test_job_with_no_required_skills_gives_zero(self, hr_user, candidate, db):
        """A job with zero required skills always scores 0, never divides by zero."""
        department = Department.objects.first()
        job = Job.objects.create(
            title='No Skills Job',
            description='Test',
            department=department,
            created_by=hr_user,
        )
        application = Application.objects.create(
            job=job, candidate=candidate, resume_file='resumes/test.pdf',
        )
        score = match_and_score(application.id, ['Python', 'Django'])
        assert score == 0


@pytest.mark.django_db
class TestProcessResumeTask:
    @patch('services.matching_service.match_and_score')
    @patch('services.ai_service.get_ai_provider')
    @patch('services.resume_parser.extract_text_from_pdf')
    def test_full_pipeline_success_creates_ai_log(
        self, mock_extract, mock_get_provider, mock_match,
        application_with_resume
    ):
        """
        A successful pipeline run creates an AIProcessingLog with
        the correct token usage and human_override_applied=False.
        """
        mock_extract.return_value = 'Sample resume text with Python and Django'

        mock_provider = MagicMock()
        mock_provider.extract_skills.return_value = {
            'extracted_skills': ['Python', 'Django', 'React'],
            'tokens_used': 500,
        }
        mock_get_provider.return_value = mock_provider

        mock_match.return_value = 100

        process_resume(application_with_resume.id)

        log = AIProcessingLog.objects.get(application=application_with_resume)
        assert log.tokens_used == 500
        assert log.human_override_applied is False
        assert log.processing_time_ms >= 0

    @patch('services.resume_parser.extract_text_from_pdf')
    def test_pipeline_handles_pdf_extraction_failure_gracefully(
        self, mock_extract, application_with_resume
    ):
        """
        If PDF extraction fails, the task creates a failed log
        instead of crashing unrecoverably.
        """
        mock_extract.side_effect = ResumeParseError('Corrupted PDF')

        result = process_resume(application_with_resume.id)

        assert result['status'] == 'FAILURE'
        log = AIProcessingLog.objects.get(application=application_with_resume)
        assert log.tokens_used == 0

    def test_pipeline_handles_missing_application_gracefully(self):
        """Calling the task with a nonexistent application_id doesn't crash."""
        result = process_resume(999999)
        assert result['status'] == 'FAILURE'
        assert result['reason'] == 'Application not found'


@pytest.mark.django_db
class TestResumeParser:
    def test_extract_text_raises_on_missing_file(self):
        """A nonexistent file path raises ResumeParseError, not a raw exception."""
        with pytest.raises(ResumeParseError):
            extract_text_from_pdf('/tmp/this_file_does_not_exist_12345.pdf')
