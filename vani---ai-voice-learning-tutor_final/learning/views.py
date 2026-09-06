from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import LearningSession, Message

def session_detail(request, id):
    """
    GET /api/sessions/<id>/
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    session = get_object_or_404(LearningSession, id=id)

    summary_data = None
    if hasattr(session, 'summary'):
        s = session.summary
        summary_data = {
            'concept_learned': s.concept_learned,
            'strengths': s.strengths,
            'areas_for_improvement': s.areas_for_improvement,
            'recommended_next_step': s.recommended_next_step,
            'mastery_score': s.mastery_score,
            'evaluator_model': s.evaluator_model,
            'created_at': s.created_at.isoformat(),
        }

    return JsonResponse({
        'id': session.id,
        'student_id': session.student_id,
        'student_name': session.student.name,
        'student_phone': session.student.phone_number,
        'topic': session.topic,
        'status': session.status,
        'call_sid': session.call_sid,
        'model_choice': session.model_choice,
        'current_turn': session.current_turn,
        'started_at': session.started_at.isoformat(),
        'ended_at': session.ended_at.isoformat() if session.ended_at else None,
        'summary': summary_data,
    })


def session_messages(request, id):
    """
    GET /api/sessions/<id>/messages/
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    session = get_object_or_404(LearningSession, id=id)
    messages = session.messages.order_by('timestamp')

    data = [
        {
            'id': m.id,
            'role': m.role,
            'content': m.content,
            'model_used': m.model_used,
            'timestamp': m.timestamp.isoformat(),
        }
        for m in messages
    ]

    return JsonResponse({
        'session_id': session.id,
        'student_name': session.student.name,
        'topic': session.topic,
        'model_choice': session.model_choice,
        'total_messages': len(data),
        'messages': data,
    })


def available_models(request):
    """
    GET /api/models/
    Returns list of AI models configured for voice tutoring and evaluation.
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    has_anthropic_key = bool(getattr(settings, 'ANTHROPIC_AZURE_API_KEY', ''))
    has_gemini_key = bool(getattr(settings, 'GEMINI_API_KEY', ''))

    models = [
        {
            'id': 'claude-opus-5',
            'name': 'Claude Opus 5 (Azure Anthropic)',
            'provider': 'Anthropic Foundry on Azure AI',
            'endpoint': getattr(settings, 'ANTHROPIC_AZURE_ENDPOINT', ''),
            'is_configured': has_anthropic_key,
            'recommended_for': 'Deep Socratic Dialogue & Real-World Reasoning',
            'description': 'Advanced cognitive tutor that provides intuitive, patient explanations and relatable metaphors.',
        },
        {
            'id': 'gemini-3.6-flash',
            'name': 'Gemini 3.6 Flash (Google GenAI)',
            'provider': 'Google Gemini API',
            'is_configured': has_gemini_key,
            'recommended_for': 'High Speed & Fast Telephony Turnaround',
            'description': 'Ultra-fast low-latency Socratic conversational model with instant answer verification.',
        },
        {
            'id': 'hybrid',
            'name': 'Multi-Model (Claude Tutor + Gemini Evaluator)',
            'provider': 'Anthropic + Google Orchestration',
            'is_configured': has_anthropic_key or has_gemini_key,
            'recommended_for': 'Comprehensive Multi-Agent Telephony Experience',
            'description': 'Claude Opus 5 powers conversational Socratic voice dialogue while Gemini 3.6 Flash assesses mastery.',
        },
    ]

    return JsonResponse({
        'active_default': 'claude-opus-5',
        'models': models,
    })
