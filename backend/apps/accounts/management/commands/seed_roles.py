from django.core.management.base import BaseCommand
from apps.accounts.models import Role, Department


class Command(BaseCommand):
    help = 'Seeds the database with default roles and departments'

    def handle(self, *args, **kwargs):
        # Create default roles
        roles = [
            'ADMIN',
            'HR_MANAGER',
            'INTERVIEWER',
        ]

        for role_title in roles:
            role, created = Role.objects.get_or_create(title=role_title)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created role: {role_title}'))
            else:
                self.stdout.write(f'Role already exists: {role_title}')

        # Create default departments
        departments = [
            'Engineering',
            'Human Resources',
            'Product',
            'Design',
            'Marketing',
            'Finance',
            'Operations',
        ]

        for dept_name in departments:
            dept, created = Department.objects.get_or_create(name=dept_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created department: {dept_name}'))
            else:
                self.stdout.write(f'Department already exists: {dept_name}')

        self.stdout.write(self.style.SUCCESS('\nRoles and departments seeded successfully.'))
