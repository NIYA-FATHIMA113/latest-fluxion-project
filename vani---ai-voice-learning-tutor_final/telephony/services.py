"""
Telephony services for TwiML voice responses and Twilio signature verification.
"""

import logging
from django.conf import settings
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.request_validator import RequestValidator

logger = logging.getLogger(__name__)

DEFAULT_VOICE = getattr(settings, 'TWILIO_VOICE', 'Polly.Aditi')
DEFAULT_LANGUAGE = getattr(settings, 'TWILIO_VOICE_LANGUAGE', 'en-IN')


def build_gather_response(speech_text: str, action_url: str, hint_prompt: str = "") -> VoiceResponse:
    """
    Constructs a TwiML VoiceResponse that speaks speech_text inside a Gather,
    so the speech recognition begins immediately and handles responses seamlessly.
    """
    response = VoiceResponse()

    # Create Gather with speech input
    gather = Gather(
        input='speech',
        action=action_url,
        method='POST',
        speech_timeout='auto',
        timeout=5,
        language=DEFAULT_LANGUAGE,
    )
    gather.say(speech_text, voice=DEFAULT_VOICE, language=DEFAULT_LANGUAGE)
    response.append(gather)

    # Fallback if student pauses or doesn't speak during timeout
    if hint_prompt:
        response.say(hint_prompt, voice=DEFAULT_VOICE, language=DEFAULT_LANGUAGE)
    else:
        response.say("I'm listening. Take your time, whenever you are ready.", voice=DEFAULT_VOICE, language=DEFAULT_LANGUAGE)

    # Re-prompt by redirecting to action url
    response.redirect(action_url, method='POST')
    return response


def build_goodbye_response(goodbye_text: str) -> VoiceResponse:
    """
    Constructs a TwiML VoiceResponse that speaks the farewell and hangs up.
    """
    response = VoiceResponse()
    response.say(goodbye_text, voice=DEFAULT_VOICE, language=DEFAULT_LANGUAGE)
    response.hangup()
    return response


def validate_twilio_signature(request) -> bool:
    """
    Validates Twilio webhook signature if TWILIO_VALIDATE_SIGNATURE is enabled.
    Returns True if valid or if validation is disabled (for local testing).
    """
    validate_enabled = getattr(settings, 'TWILIO_VALIDATE_SIGNATURE', False)
    if not validate_enabled:
        return True

    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    if not auth_token:
        logger.warning("Twilio signature validation enabled but TWILIO_AUTH_TOKEN is empty.")
        return True

    signature = request.META.get('HTTP_X_TWILIO_SIGNATURE', '')
    if not signature:
        return False

    validator = RequestValidator(auth_token)
    url = request.build_absolute_uri()
    post_vars = request.POST.dict()

    return validator.validate(url, post_vars, signature)
