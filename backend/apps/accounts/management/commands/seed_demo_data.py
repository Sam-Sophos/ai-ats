import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.accounts.models import User, Role, Department
from apps.jobs.models import Job, Skill, JobSkill
from apps.candidates.models import Candidate
from apps.applications.models import (
    Application,
    ApplicationSkill,
    ApplicationStatusHistory,
    Status,
    JobOffer,
    AIProcessingLog,
)
from apps.interviews.models import Interview, InterviewParticipant, Evaluation
from apps.communications.models import MessageTemplate, CommunicationsLog


class Command(BaseCommand):
    help = (
        'Seeds the database with a small realistic demo dataset: '
        '5 jobs, 15 candidates, ~18 applications with fake AI scores, '
        'interviews, evaluations, and communications. '
        'Does NOT call any real AI API — all scores are simulated.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete existing demo data before seeding (keeps roles/statuses/departments).',
        )

    def handle(self, *args, **options):
        try:
            from faker import Faker
        except ImportError:
            self.stderr.write(self.style.ERROR(
                'The "Faker" package is required. Install it with: pip install Faker'
            ))
            return

        fake = Faker()
        random.seed(42)
        fake.seed_instance(42)

        if options['flush']:
            self._flush_demo_data()

        with transaction.atomic():
            self.stdout.write('Seeding base lookup data...')
            roles = self._seed_roles()
            departments = self._seed_departments()
            statuses = self._seed_statuses()
            skills = self._seed_skills()

            self.stdout.write('Creating demo users (HR + interviewers)...')
            users = self._seed_users(fake, roles, departments)

            self.stdout.write('Creating 5 jobs with required skills...')
            jobs = self._seed_jobs(fake, users, departments, skills)

            self.stdout.write('Creating 15 candidates...')
            candidates = self._seed_candidates(fake)

            self.stdout.write('Creating applications with simulated AI scores...')
            applications = self._seed_applications(
                fake, jobs, candidates, skills, statuses, users
            )

            self.stdout.write('Creating interviews and evaluations...')
            self._seed_interviews(fake, applications, users)

            self.stdout.write('Creating message templates and communications...')
            self._seed_communications(fake, applications, users)

        self.stdout.write(self.style.SUCCESS(
            f'\nDemo data seeded successfully:\n'
            f'  {len(users)} users\n'
            f'  {len(jobs)} jobs\n'
            f'  {len(candidates)} candidates\n'
            f'  {len(applications)} applications\n'
        ))

    # ------------------------------------------------------------------
    # Lookup data (idempotent — safe to run multiple times)
    # ------------------------------------------------------------------

    def _seed_roles(self):
        titles = ['ADMIN', 'HR_MANAGER', 'INTERVIEWER']
        roles = {}
        for title in titles:
            role, _ = Role.objects.get_or_create(title=title)
            roles[title] = role
        return roles

    def _seed_departments(self):
        names = ['Engineering', 'Product', 'Design', 'Human Resources', 'Marketing']
        departments = {}
        for name in names:
            dept, _ = Department.objects.get_or_create(name=name)
            departments[name] = dept
        return departments

    def _seed_statuses(self):
        defaults = [
            (1, 'Applied'), (2, 'Screening'), (3, 'Interview'),
            (4, 'Technical Assessment'), (5, 'Offer'),
            (6, 'Hired'), (7, 'Rejected'), (8, 'Withdrawn'),
        ]
        statuses = {}
        for order, name in defaults:
            status, _ = Status.objects.get_or_create(
                sequence_order=order, defaults={'status_name': name}
            )
            statuses[name] = status
        return statuses

    def _seed_skills(self):
        names = [
            'Python', 'Django', 'React', 'JavaScript', 'TypeScript',
            'PostgreSQL', 'Node.js', 'AWS', 'Docker', 'Kubernetes',
            'Java', 'Spring Boot', 'Figma', 'UI Design', 'SQL',
            'Git', 'REST API', 'GraphQL', 'CI/CD', 'Communication',
            'Leadership', 'Project Management', 'Agile', 'Vue.js', 'Go',
        ]
        skills = {}
        for name in names:
            skill, _ = Skill.objects.get_or_create(skill_name=name)
            skills[name] = skill
        return skills

    # ------------------------------------------------------------------
    # Demo-specific data
    # ------------------------------------------------------------------

    def _seed_users(self, fake, roles, departments):
        users = []

        hr1, created = User.objects.get_or_create(
            email='sarah.hr@democorp.com',
            defaults={
                'first_name': 'Sarah',
                'last_name': 'Mitchell',
                'role': roles['HR_MANAGER'],
                'department': departments['Human Resources'],
            },
        )
        if created:
            hr1.set_password('demo12345')
            hr1.save()
        users.append(hr1)

        interviewer_names = [
            ('David', 'Chen', 'Engineering'),
            ('Maria', 'Garcia', 'Engineering'),
            ('James', 'Okafor', 'Product'),
            ('Lina', 'Yusuf', 'Design'),
        ]
        for first, last, dept_name in interviewer_names:
            email = f'{first.lower()}.{last.lower()}@democorp.com'
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first,
                    'last_name': last,
                    'role': roles['INTERVIEWER'],
                    'department': departments[dept_name],
                },
            )
            if created:
                user.set_password('demo12345')
                user.save()
            users.append(user)

        return users

    def _seed_jobs(self, fake, users, departments, skills):
        hr_user = users[0]
        job_definitions = [
            ('Senior Backend Engineer', 'Engineering',
             ['Python', 'Django', 'PostgreSQL', 'REST API', 'Docker', 'AWS']),
            ('Frontend Developer', 'Engineering',
             ['JavaScript', 'React', 'TypeScript', 'Git', 'CI/CD']),
            ('Product Manager', 'Product',
             ['Project Management', 'Agile', 'Communication', 'Leadership']),
            ('UI/UX Designer', 'Design',
             ['Figma', 'UI Design', 'Communication']),
            ('DevOps Engineer', 'Engineering',
             ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Python']),
        ]

        jobs = []
        for title, dept_name, required_skills in job_definitions:
            job, created = Job.objects.get_or_create(
                title=title,
                department=departments[dept_name],
                defaults={
                    'description': fake.paragraph(nb_sentences=5),
                    'created_by': hr_user,
                },
            )
            if created:
                for skill_name in required_skills:
                    JobSkill.objects.get_or_create(job=job, skill=skills[skill_name])
            jobs.append(job)

        return jobs

    def _seed_candidates(self, fake):
        candidates = []
        for _ in range(15):
            first = fake.first_name()
            last = fake.last_name()
            email = f'{first.lower()}.{last.lower()}{random.randint(1,999)}@example.com'
            candidate, _ = Candidate.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first,
                    'last_name': last,
                    'phone': fake.phone_number()[:20],
                },
            )
            candidates.append(candidate)
        return candidates

    def _seed_applications(self, fake, jobs, candidates, skills, statuses, users):
        hr_user = users[0]
        all_skill_names = list(skills.keys())
        applications = []

        # Each candidate applies to 1-2 random jobs
        pairs_seen = set()
        for candidate in candidates:
            num_applications = random.choice([1, 1, 2])
            chosen_jobs = random.sample(jobs, min(num_applications, len(jobs)))

            for job in chosen_jobs:
                pair_key = (job.id, candidate.id)
                if pair_key in pairs_seen:
                    continue
                pairs_seen.add(pair_key)

                required_skill_ids = set(
                    JobSkill.objects.filter(job=job).values_list('skill_id', flat=True)
                )

                # Simulate a realistic match: candidate "has" 60-100% of
                # required skills, plus a few random extras.
                required_skills = list(
                    Skill.objects.filter(id__in=required_skill_ids)
                )
                num_matched = random.randint(
                    max(1, int(len(required_skills) * 0.4)),
                    len(required_skills)
                ) if required_skills else 0
                matched_skills = random.sample(
                    required_skills, min(num_matched, len(required_skills))
                ) if required_skills else []

                extra_skill_names = random.sample(
                    all_skill_names, k=random.randint(2, 5)
                )
                extra_skills = [skills[name] for name in extra_skill_names]

                candidate_skills = list(set(matched_skills + extra_skills))

                score = (
                    round((len(matched_skills) / len(required_skills)) * 100)
                    if required_skills else 0
                )

                days_ago = random.randint(1, 45)
                applied_date = timezone.now() - timedelta(days=days_ago)

                application = Application.objects.create(
                    job=job,
                    candidate=candidate,
                    ai_match_score=score,
                    resume_file=f'resumes/demo_{candidate.id}_{job.id}.pdf',
                )
                # Backdate applied_date for realism
                Application.objects.filter(id=application.id).update(
                    applied_date=applied_date
                )
                application.refresh_from_db()

                for skill in candidate_skills:
                    ApplicationSkill.objects.get_or_create(
                        application=application, skill=skill
                    )

                AIProcessingLog.objects.create(
                    application=application,
                    tokens_used=random.randint(400, 1200),
                    processing_time_ms=random.randint(800, 3000),
                    human_override_applied=False,
                )

                # Build a realistic status journey based on score
                self._build_status_journey(application, score, statuses, hr_user, applied_date)

                applications.append(application)

        return applications

    def _build_status_journey(self, application, score, statuses, hr_user, applied_date):
        """
        Higher-scoring applications progress further through the pipeline.
        Creates a believable sequence of ApplicationStatusHistory records
        with increasing timestamps.
        """
        journey = [statuses['Applied']]

        if score >= 40:
            journey.append(statuses['Screening'])
        if score >= 60:
            journey.append(statuses['Interview'])
        if score >= 75:
            journey.append(random.choice([
                statuses['Technical Assessment'], statuses['Offer']
            ]))
        if score >= 90 and random.random() > 0.4:
            journey.append(statuses['Hired'])
        elif score < 40 and random.random() > 0.5:
            journey.append(statuses['Rejected'])

        current_time = applied_date
        for status in journey:
            ApplicationStatusHistory.objects.create(
                application=application,
                status=status,
                changed_by=hr_user,
            )
            ApplicationStatusHistory.objects.filter(
                application=application, status=status
            ).update(date_changed=current_time)
            current_time += timedelta(days=random.randint(1, 5))

        if journey[-1] == statuses['Offer']:
            JobOffer.objects.get_or_create(
                application=application,
                defaults={
                    'salary_offered': random.randint(40000, 120000),
                    'target_start_date': timezone.now() + timedelta(days=30),
                    'is_accepted': None,
                },
            )

    def _seed_interviews(self, fake, applications, users):
        interviewers = users[1:]
        interview_candidates = [
            app for app in applications if app.ai_match_score and app.ai_match_score >= 60
        ]

        for application in interview_candidates[:8]:
            interview = Interview.objects.create(
                application=application,
                scheduled_date=timezone.now() + timedelta(days=random.randint(-10, 10)),
                meeting_link=fake.url(),
            )
            participants = random.sample(interviewers, min(2, len(interviewers)))
            for interviewer in participants:
                InterviewParticipant.objects.get_or_create(
                    interview=interview, user=interviewer
                )
                if random.random() > 0.3:
                    Evaluation.objects.get_or_create(
                        interview=interview,
                        evaluator=interviewer,
                        defaults={
                            'score': random.randint(5, 10),
                            'written_feedback': fake.paragraph(nb_sentences=3),
                        },
                    )

    def _seed_communications(self, fake, applications, users):
        hr_user = users[0]
        templates_data = [
            ('Application Received', 'We received your application',
             'Hi {{candidate_name}}, thank you for applying to {{job_title}} at {{company_name}}. We will review your application shortly.'),
            ('Interview Invitation', 'Interview invitation',
             'Hi {{candidate_name}}, we would like to invite you to interview for {{job_title}}.'),
            ('Rejection', 'Update on your application',
             'Hi {{candidate_name}}, thank you for your interest in {{job_title}}. We have decided to move forward with other candidates at this time.'),
            ('Offer Extended', 'Job offer',
             'Hi {{candidate_name}}, we are excited to offer you the {{job_title}} position!'),
        ]
        templates = {}
        for name, subject, body in templates_data:
            template, _ = MessageTemplate.objects.get_or_create(
                template_name=name,
                defaults={'email_subject': subject, 'email_body': body},
            )
            templates[name] = template

        for application in applications[:12]:
            template = templates['Application Received']
            content = template.email_body.replace(
                '{{candidate_name}}', application.candidate.get_full_name()
            ).replace('{{job_title}}', application.job.title).replace(
                '{{company_name}}', 'DemoCorp'
            )
            CommunicationsLog.objects.get_or_create(
                application=application,
                template=template,
                defaults={'sender': hr_user, 'message_content': content},
            )

    def _flush_demo_data(self):
        self.stdout.write('Flushing existing demo data...')
        CommunicationsLog.objects.all().delete()
        Evaluation.objects.all().delete()
        InterviewParticipant.objects.all().delete()
        Interview.objects.all().delete()
        JobOffer.objects.all().delete()
        AIProcessingLog.objects.all().delete()
        ApplicationStatusHistory.objects.all().delete()
        ApplicationSkill.objects.all().delete()
        Application.objects.all().delete()
        Candidate.objects.all().delete()
        JobSkill.objects.all().delete()
        Job.objects.all().delete()
