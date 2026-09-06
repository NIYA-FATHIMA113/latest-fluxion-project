"""
Management command to seed initial student and progress data for demo.
"""

from django.core.management.base import BaseCommand
from students.models import Student, Progress

class Command(BaseCommand):
    help = "Seed demo student Ravi Sharma and initial progress"

    def handle(self, *args, **options):
        student, created = Student.objects.get_or_create(
            phone_number="+919876543210",
            defaults={
                "name": "Ravi Sharma",
                "grade": "10",
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created student: {student.name} ({student.phone_number})"))
        else:
            self.stdout.write(f"Student already exists: {student.name} ({student.phone_number})")

        progress, p_created = Progress.objects.get_or_create(
            student=student,
            topic="Fractions",
            defaults={
                "mastery_score": 70,
                "sessions_completed": 2,
            }
        )
        if p_created:
            self.stdout.write(self.style.SUCCESS(f"Created progress for topic: {progress.topic}"))
        else:
            self.stdout.write(f"Progress exists for topic: {progress.topic}")
