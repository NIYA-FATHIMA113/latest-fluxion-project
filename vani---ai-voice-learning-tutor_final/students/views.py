from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Student, Progress

def student_detail(request, id):
    """
    GET /api/students/<id>/
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    student = get_object_or_404(Student, id=id)
    return JsonResponse({
        'id': student.id,
        'name': student.name,
        'phone_number': student.phone_number,
        'grade': student.grade,
        'created_at': student.created_at.isoformat(),
    })

def student_progress(request, student_id):
    """
    GET /api/progress/<student_id>/
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    student = get_object_or_404(Student, id=student_id)
    records = Progress.objects.filter(student=student)
    data = [
        {
            'id': record.id,
            'topic': record.topic,
            'mastery_score': record.mastery_score,
            'sessions_completed': record.sessions_completed,
            'last_studied': record.last_studied.isoformat(),
        }
        for record in records
    ]
    return JsonResponse({
        'student_id': student.id,
        'student_name': student.name,
        'progress': data,
    })
