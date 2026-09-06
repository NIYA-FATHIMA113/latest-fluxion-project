from django.urls import path
from . import views

urlpatterns = [
    path('voice/incoming/', views.incoming_call, name='voice_incoming'),
    path('voice/interact/', views.voice_interact, name='voice_interact'),
    path('voice/goodbye/', views.voice_goodbye, name='voice_goodbye'),
]
