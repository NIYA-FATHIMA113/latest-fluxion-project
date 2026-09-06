from django.db import models
from students.models import Student

class LearningSession(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]
    MODEL_CHOICES = [
        ('claude-opus-5', 'Claude Opus 5 (Azure Anthropic)'),
        ('gemini-3.6-flash', 'Gemini 3.6 Flash (Google GenAI)'),
        ('hybrid', 'Multi-Model (Claude Tutor + Gemini Evaluator)'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='learning_sessions')
    topic = models.CharField(max_length=120, default="Fractions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    call_sid = models.CharField(max_length=64, blank=True, default="", db_index=True)
    model_choice = models.CharField(max_length=50, choices=MODEL_CHOICES, default='claude-opus-5')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    current_turn = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"Session #{self.id} - {self.student.name} ({self.topic}) [{self.model_choice}] [{self.status}]"


class Message(models.Model):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('tutor', 'Tutor'),
    ]

    session = models.ForeignKey(LearningSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    model_used = models.CharField(max_length=50, blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"[{self.role.upper()}] Session #{self.session_id}: {self.content[:40]}..."


class SessionSummary(models.Model):
    session = models.OneToOneField(LearningSession, on_delete=models.CASCADE, related_name='summary')
    concept_learned = models.TextField(blank=True)
    strengths = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)
    recommended_next_step = models.TextField(blank=True)
    mastery_score = models.IntegerField(default=0)
    evaluator_model = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Summary for Session #{self.session_id} - Mastery: {self.mastery_score}%"
