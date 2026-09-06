from django.urls import path
from . import views

urlpatterns = [
    path('students/<int:id>/', views.student_detail, name='student_detail'),
    path('progress/<int:student_id>/', views.student_progress, name='student_progress'),
]
