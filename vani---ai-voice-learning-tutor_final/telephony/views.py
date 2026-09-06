"""
Twilio Voice Webhook Views for Vani AI Tutor.
Handles incoming calls, speech recognition interaction loop, and session termination.
"""

import logging
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from students.models import Student, Progress
from learning.models import LearningSession, Message
from learning.services import (
    generate_tutor_response,
    is_goodbye_intent,
    finalize_session_and_progress,
)
from .services import (
    build_gather_response,
    build_goodbye_response,
    validate_twilio_signature,
)

logger = logging.getLogger(__name__)


@csrf_exempt
def incoming_call(request):
    """
    POST /api/telephony/voice/incoming/
    Triggered when a student dials the Twilio phone number.
    Identifies or registers student, initializes LearningSession, and starts voice Gather.
    """
    if request.method not in ['POST', 'GET']:
        return HttpResponse("Method not allowed", status=405)

    if not validate_twilio_signature(request):
        logger.warning("Invalid Twilio signature on incoming call")
        return HttpResponse("Forbidden", status=403)

    from_number = request.POST.get('From', '').strip() or request.GET.get('From', '').strip()
    call_sid = request.POST.get('CallSid', '').strip() or request.GET.get('CallSid', '').strip()
    model_choice = request.POST.get('model', '').strip() or request.GET.get('model', '').strip() or 'claude-opus-5'
    topic_param = request.POST.get('topic', '').strip() or request.GET.get('topic', '').strip()

    # Default demo phone if testing locally without params
    if not from_number:
        from_number = "+919876543210"

    # Find or create student
    student, created = Student.objects.get_or_create(
        phone_number=from_number,
        defaults={
            'name': 'Ravi Sharma' if from_number == '+919876543210' else 'Student',
            'grade': '10',
        }
    )

    # Determine topic: check if student has a recent topic, default to "Fractions"
    topic = topic_param or "Fractions"
    if not topic_param:
        last_progress = Progress.objects.filter(student=student).order_by('-last_studied').first()
        if last_progress and last_progress.topic:
            topic = last_progress.topic

    # Create active LearningSession
    session = LearningSession.objects.create(
        student=student,
        topic=topic,
        status='active',
        call_sid=call_sid,
        model_choice=model_choice,
        current_turn=0,
    )

    # Compose personalized opening greeting
    display_name = student.name.split()[0] if student.name and student.name != 'Student' else None
    if display_name:
        greeting = (
            f"Hi {display_name}, welcome back to Vani! Today we're going to explore {topic}. "
            "I'll guide you with a few questions. You can ask me anything or tell me what you're thinking. Ready?"
        )
    else:
        greeting = (
            f"Hi, I'm Vani, your personal AI voice tutor! Today we're going to explore {topic} together. "
            "I'll guide you with a few questions. Tell me what you're thinking anytime. Ready?"
        )

    # Save tutor greeting as first message
    Message.objects.create(
        session=session,
        role='tutor',
        content=greeting,
        model_used=model_choice,
    )

    action_url = f"/api/telephony/voice/interact/?session_id={session.id}"
    twiml_response = build_gather_response(
        speech_text=greeting,
        action_url=action_url,
        hint_prompt="Whenever you're ready, tell me what you think, or say 'yes' to begin.",
    )

    logger.info(f"Incoming call from {from_number} (CallSid: {call_sid}, Model: {model_choice}) -> Session #{session.id}")
    return HttpResponse(str(twiml_response), content_type='application/xml')


@csrf_exempt
def voice_interact(request):
    """
    POST /api/telephony/voice/interact/
    Receives Twilio SpeechResult, invokes Socratic Gemini engine,
    persists conversational history, and returns next TwiML speech Gather.
    """
    if request.method not in ['POST', 'GET']:
        return HttpResponse("Method not allowed", status=405)

    if not validate_twilio_signature(request):
        logger.warning("Invalid Twilio signature on voice_interact")
        return HttpResponse("Forbidden", status=403)

    session_id = request.GET.get('session_id') or request.POST.get('session_id')
    call_sid = request.POST.get('CallSid', '').strip()
    speech_result = request.POST.get('SpeechResult', '').strip()

    # Look up active session
    session = None
    if session_id:
        try:
            session = LearningSession.objects.filter(id=int(session_id)).first()
        except (ValueError, TypeError):
            pass

    if not session and call_sid:
        session = LearningSession.objects.filter(call_sid=call_sid, status='active').order_by('-started_at').first()

    if not session:
        # Fallback to the latest active session or create a quick fallback session
        session = LearningSession.objects.filter(status='active').order_by('-started_at').first()

    if not session:
        # If no active session exists, create a demo session
        student, _ = Student.objects.get_or_create(
            phone_number="+919876543210",
            defaults={'name': 'Ravi Sharma', 'grade': '10'}
        )
        session = LearningSession.objects.create(
            student=student,
            topic="Fractions",
            status='active',
            call_sid=call_sid,
        )

    action_url = f"/api/telephony/voice/interact/?session_id={session.id}"

    # Handle silence or missing speech
    if not speech_result:
        prompt_speech = "I didn't quite catch that. You can share your thoughts or ask a question. What do you think?"
        twiml_response = build_gather_response(
            speech_text=prompt_speech,
            action_url=action_url,
        )
        return HttpResponse(str(twiml_response), content_type='application/xml')

    # Model parameter from query or body
    model_param = request.POST.get('model', '').strip() or request.GET.get('model', '').strip()
    if model_param and model_param != session.model_choice:
        session.model_choice = model_param
        session.save(update_fields=['model_choice'])

    logger.info(
        f"Session #{session.id} Turn #{session.current_turn + 1} [{session.model_choice}] - "
        f"Student said: '{speech_result}'"
    )

    # Check for goodbye / conclusion intent
    if is_goodbye_intent(speech_result):
        # Save final student utterance
        Message.objects.create(
            session=session,
            role='student',
            content=speech_result,
        )

        # Finalize learning session, generate Claude / Gemini summary, update progress
        summary = finalize_session_and_progress(session, model_choice=session.model_choice)

        student_name = session.student.name.split()[0] if session.student.name else "friend"
        goodbye_text = (
            f"You did a great job today, {student_name}. You now understand key concepts in {session.topic}. "
            "Keep practicing, and I'll be here whenever you're ready. Goodbye!"
        )

        # Save tutor goodbye
        Message.objects.create(
            session=session,
            role='tutor',
            content=goodbye_text,
            model_used=session.model_choice,
        )

        twiml_response = build_goodbye_response(goodbye_text)
        logger.info(f"Session #{session.id} ended. Summary mastery: {summary.mastery_score}% [{summary.evaluator_model}]")
        return HttpResponse(str(twiml_response), content_type='application/xml')

    # Regular conversational learning turn
    # 1. Save student message
    Message.objects.create(
        session=session,
        role='student',
        content=speech_result,
    )

    # 2. Increment turn count
    session.current_turn += 1
    session.save(update_fields=['current_turn'])

    # 3. Generate Socratic AI response via Claude Opus 5 or Gemini
    tutor_res = generate_tutor_response(session, speech_result, model_choice=session.model_choice)
    if isinstance(tutor_res, (list, tuple)):
        tutor_reply, model_used = tutor_res[0], tutor_res[1]
    else:
        tutor_reply, model_used = str(tutor_res), getattr(session, 'model_choice', 'claude-opus-5')

    # 4. Save tutor message with model used
    Message.objects.create(
        session=session,
        role='tutor',
        content=tutor_reply,
        model_used=model_used,
    )

    logger.info(f"Session #{session.id} - Vani [{model_used}] answered: '{tutor_reply}'")

    # 5. Return TwiML with Say inside Gather so the loop continues indefinitely
    twiml_response = build_gather_response(
        speech_text=tutor_reply,
        action_url=action_url,
        hint_prompt="Take your time. What are you thinking?",
    )
    return HttpResponse(str(twiml_response), content_type='application/xml')


@csrf_exempt
def voice_goodbye(request):
    """
    POST /api/telephony/voice/goodbye/
    Explicit call termination endpoint.
    Finalizes session, generates summary, updates student progress, and hangs up.
    """
    if request.method not in ['POST', 'GET']:
        return HttpResponse("Method not allowed", status=405)

    session_id = request.GET.get('session_id') or request.POST.get('session_id')
    call_sid = request.POST.get('CallSid', '').strip()

    session = None
    if session_id:
        try:
            session = LearningSession.objects.filter(id=int(session_id)).first()
        except (ValueError, TypeError):
            pass

    if not session and call_sid:
        session = LearningSession.objects.filter(call_sid=call_sid).order_by('-started_at').first()

    if not session:
        session = LearningSession.objects.filter(status='active').order_by('-started_at').first()

    if session and session.status == 'active':
        summary = finalize_session_and_progress(session, model_choice=session.model_choice)
        student_name = session.student.name.split()[0] if session.student.name else "friend"
        goodbye_text = (
            f"Thank you for learning with Vani today, {student_name}. "
            f"You made great progress in {session.topic}. Goodbye!"
        )
    else:
        goodbye_text = "Thank you for learning with Vani today. Keep practicing and goodbye!"

    twiml_response = build_goodbye_response(goodbye_text)
    return HttpResponse(str(twiml_response), content_type='application/xml')
