from django.core.management.base import BaseCommand
from apps.applications.models import Status


class Command(BaseCommand):
    help = 'Seeds the database with the default hiring pipeline statuses'

    def handle(self, *args, **kwargs):
        # Statuses are ordered by sequence_order
        # This defines the exact flow of the hiring pipeline
        statuses = [
            (1, 'Applied'),
            (2, 'Screening'),
            (3, 'Interview'),
            (4, 'Technical Assessment'),
            (5, 'Offer'),
            (6, 'Hired'),
            (7, 'Rejected'),
            (8, 'Withdrawn'),
        ]

        for sequence_order, status_name in statuses:
            status, created = Status.objects.get_or_create(
                sequence_order=sequence_order,
                defaults={'status_name': status_name}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(
                    f'Created status: [{sequence_order}] {status_name}'
                ))
            else:
                self.stdout.write(
                    f'Status already exists: [{sequence_order}] {status.status_name}'
                )

        self.stdout.write(self.style.SUCCESS('\nPipeline statuses seeded successfully.'))
