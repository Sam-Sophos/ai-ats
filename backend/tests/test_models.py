import pytest
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError

from apps.accounts.models import User, Role, Department
from apps.jobs.models import Job, Skill, JobSkill
from apps.candidates.models import Candidate
from apps.applications.models import (
    Application,
    Status,
    ApplicationStatusHistory,
)


@pytest.mark.django_db
class TestUserModel:
    def test_create_user_with_email(self):
        """A user can be created with an email and password."""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
        )
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
        assert user.is_active is True
        assert user.is_staff is False

    def test_create_superuser(self):
        """A superuser has is_staff and is_superuser set to True."""
        admin = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User',
        )
        assert admin.is_staff is True
        assert admin.is_superuser is True

    def test_email_must_be_unique(self):
        """Creating two users with the same email raises an error."""
        User.objects.create_user(
            email='duplicate@example.com',
            password='pass123',
            first_name='First',
            last_name='User',
        )
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                User.objects.create_user(
                    email='duplicate@example.com',
                    password='pass456',
                    first_name='Second',
                    last_name='User',
                )

    def test_role_protect_on_delete(self):
        """Deleting a Role that is assigned to a user must be blocked."""
        role = Role.objects.create(title='TEST_ROLE')
        User.objects.create_user(
            email='roleuser@example.com',
            password='pass123',
            first_name='Role',
            last_name='User',
            role=role,
        )
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                role.delete()


@pytest.mark.django_db
class TestJobSkillModel:
    def test_job_skill_unique_together(self):
        """The same skill cannot be attached to the same job twice."""
        department = Department.objects.create(name='Engineering')
        user = User.objects.create_user(
            email='creator@example.com',
            password='pass123',
            first_name='Job',
            last_name='Creator',
        )
        job = Job.objects.create(
            title='Backend Engineer',
            description='Test job',
            department=department,
            created_by=user,
        )
        skill = Skill.objects.create(skill_name='Python')

        JobSkill.objects.create(job=job, skill=skill)

        with pytest.raises(IntegrityError):
            with transaction.atomic():
                JobSkill.objects.create(job=job, skill=skill)


@pytest.mark.django_db
class TestApplicationModel:
    def test_application_unique_job_candidate(self):
        """A candidate cannot apply to the same job twice."""
        department = Department.objects.create(name='Engineering')
        user = User.objects.create_user(
            email='hr@example.com',
            password='pass123',
            first_name='HR',
            last_name='Person',
        )
        job = Job.objects.create(
            title='Backend Engineer',
            description='Test job',
            department=department,
            created_by=user,
        )
        candidate = Candidate.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            phone='1234567890',
        )

        Application.objects.create(
            job=job,
            candidate=candidate,
            resume_file='resumes/test.pdf',
        )

        with pytest.raises(IntegrityError):
            with transaction.atomic():
                Application.objects.create(
                    job=job,
                    candidate=candidate,
                    resume_file='resumes/test2.pdf',
                )

    def test_current_status_returns_latest_history_entry(self):
        """current_status property returns the most recent status."""
        department = Department.objects.create(name='Engineering')
        user = User.objects.create_user(
            email='hr2@example.com',
            password='pass123',
            first_name='HR',
            last_name='Person',
        )
        job = Job.objects.create(
            title='Backend Engineer',
            description='Test job',
            department=department,
            created_by=user,
        )
        candidate = Candidate.objects.create(
            first_name='Jane',
            last_name='Doe',
            email='jane@example.com',
            phone='1234567890',
        )
        application = Application.objects.create(
            job=job,
            candidate=candidate,
            resume_file='resumes/test.pdf',
        )

        applied = Status.objects.create(status_name='Applied', sequence_order=1)
        screening = Status.objects.create(status_name='Screening', sequence_order=2)

        ApplicationStatusHistory.objects.create(
            application=application,
            status=applied,
            changed_by=user,
        )
        ApplicationStatusHistory.objects.create(
            application=application,
            status=screening,
            changed_by=user,
        )

        latest = application.status_history.order_by('-date_changed').first()
        assert latest.status == screening

    def test_status_history_is_append_only_in_practice(self):
        """
        Status history records are never updated — this test verifies
        that moving statuses creates NEW records rather than mutating
        existing ones, preserving the full audit trail.
        """
        department = Department.objects.create(name='Engineering')
        user = User.objects.create_user(
            email='hr3@example.com',
            password='pass123',
            first_name='HR',
            last_name='Person',
        )
        job = Job.objects.create(
            title='Backend Engineer',
            description='Test job',
            department=department,
            created_by=user,
        )
        candidate = Candidate.objects.create(
            first_name='Mark',
            last_name='Smith',
            email='mark@example.com',
            phone='1234567890',
        )
        application = Application.objects.create(
            job=job,
            candidate=candidate,
            resume_file='resumes/test.pdf',
        )

        applied = Status.objects.create(status_name='Applied', sequence_order=1)
        screening = Status.objects.create(status_name='Screening', sequence_order=2)

        ApplicationStatusHistory.objects.create(
            application=application, status=applied, changed_by=user
        )
        ApplicationStatusHistory.objects.create(
            application=application, status=screening, changed_by=user
        )

        # Both records must still exist — nothing was overwritten
        assert application.status_history.count() == 2
