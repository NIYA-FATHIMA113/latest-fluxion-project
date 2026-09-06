"""
URL configuration for Vani AI Voice Learning Tutor.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "Vani API",
        "version": "1.0.0",
        "voice_tutor": "Vani (Socratic Learning)",
        "default_topic": "Fractions"
    })

urlpatterns = [
    path('', health_check, name='root_health'),
    path('api/health/', health_check, name='api_health'),
    path('api/telephony/', include('telephony.urls')),
    path('api/', include('learning.urls')),
    path('api/', include('students.urls')),
    path('admin/', admin.site.urls),
]
