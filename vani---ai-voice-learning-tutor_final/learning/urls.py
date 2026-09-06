from django.urls import path
from . import views

urlpatterns = [
    path('models/', views.available_models, name='available_models'),
    path('sessions/<int:id>/', views.session_detail, name='session_detail'),
    path('sessions/<int:id>/messages/', views.session_messages, name='session_messages'),
]
