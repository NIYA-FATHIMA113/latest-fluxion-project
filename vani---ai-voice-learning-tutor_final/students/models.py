from django.db import models

class Student(models.Model):
    name = models.CharField(max_length=120, blank=True, default="Student")
    phone_number = models.CharField(max_length=30, unique=True, db_index=True)
    grade = models.CharField(max_length=20, blank=True, default="10")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.phone_number})"


class Progress(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="progress_records")
    topic = models.CharField(max_length=120)
    mastery_score = models.IntegerField(default=0)
    sessions_completed = models.IntegerField(default=0)
    last_studied = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Progress records"
        unique_together = ('student', 'topic')
        ordering = ['-last_studied']

    def __str__(self):
        return f"{self.student.name} - {self.topic} (Mastery: {self.mastery_score}%)"
