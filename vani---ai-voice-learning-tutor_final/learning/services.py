"""
Gemini AI Socratic Tutor Service for Vani.
Handles dynamic Socratic dialog generation, conversation memory,
goodbye intent detection, and session learning summarization.
"""

import os
import re
import json
import logging
from django.conf import settings
from google import genai
from google.genai import types
from .models import LearningSession, Message, SessionSummary
from students.models import Progress

logger = logging.getLogger(__name__)

VANI_SYSTEM_PROMPT = """You are Vani, a friendly AI voice tutor.

Your purpose is to help students understand concepts through conversation.
Use the Socratic method.
Do not simply give the answer.
Guide the student toward the answer using short questions, examples, hints, and encouragement.

Rules:
1. Ask one question at a time.
2. Keep responses short because the response will be spoken aloud.
3. Use simple language.
4. Never overwhelm the student with long explanations.
5. If the student is correct, acknowledge it and move to the next step.
6. If the student is wrong, gently correct their thinking using a hint.
7. Do not shame the student.
8. Adapt the difficulty based on their answers.
9. Use real-world examples when useful (like sharing pizza, chocolate bars, or cakes).
10. If the student is stuck, provide a small hint.
11. Do not reveal the final answer immediately.
12. If the student explicitly asks for the answer, explain it simply.
13. Periodically check understanding.
14. Keep the conversation natural.
15. Since this is a voice conversation, avoid markdown, bullet lists, mathematical formatting, or long paragraphs.
16. Responses should normally be one to three short sentences.
17. Never mention that you are an AI unless asked.
18. Stay focused on the student's learning topic."""


DEFAULT_GEMINI_MODEL = getattr(settings, 'GEMINI_MODEL', None) or os.getenv('GEMINI_MODEL', 'gemini-3.6-flash')
DEFAULT_CLAUDE_MODEL = getattr(settings, 'ANTHROPIC_AZURE_MODEL', None) or os.getenv('ANTHROPIC_AZURE_MODEL', 'claude-opus-5')
ANTHROPIC_ENDPOINT = getattr(settings, 'ANTHROPIC_AZURE_ENDPOINT', None) or os.getenv(
    'ANTHROPIC_AZURE_ENDPOINT', 'https://startuperbyaries.services.ai.azure.com/anthropic'
)

def clean_voice_text(text: str) -> str:
    """Clean any markdown, symbols, or formatting for smooth speech synthesis."""
    if not text:
        return ""
    # Remove markdown headers, bold, italics, code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    text = re.sub(r'[*_~#>]', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    # Remove bullet markers at start of lines
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    # Remove excessive whitespace and line breaks
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def get_gemini_client():
    """Returns initialized GenAI client using settings or environment variable."""
    api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.getenv('GEMINI_API_KEY', '')
    if not api_key:
        logger.warning("GEMINI_API_KEY is not set.")
        return None
    return genai.Client(api_key=api_key)


def get_anthropic_client():
    """
    Returns initialized AnthropicFoundry client using Azure AI Foundry endpoint and credentials.
    Supports direct API key authentication or DefaultAzureCredential bearer token provider.
    """
    api_key = getattr(settings, 'ANTHROPIC_AZURE_API_KEY', '') or os.getenv('ANTHROPIC_AZURE_API_KEY', '')
    endpoint = getattr(settings, 'ANTHROPIC_AZURE_ENDPOINT', '') or os.getenv(
        'ANTHROPIC_AZURE_ENDPOINT', 'https://startuperbyaries.services.ai.azure.com/anthropic'
    )

    if api_key:
        try:
            from anthropic import AnthropicFoundry
            return AnthropicFoundry(api_key=api_key, base_url=endpoint)
        except Exception as e:
            logger.error(f"Error initializing AnthropicFoundry with API key: {e}")

    # Fallback to Azure AD token provider if DefaultAzureCredential is available
    try:
        from anthropic import AnthropicFoundry
        from azure.identity import DefaultAzureCredential, get_bearer_token_provider
        token_provider = get_bearer_token_provider(DefaultAzureCredential(), "https://ai.azure.com/.default")
        return AnthropicFoundry(azure_ad_token_provider=token_provider, base_url=endpoint)
    except Exception as e:
        logger.debug(f"DefaultAzureCredential token provider not available: {e}")

    return None


def is_goodbye_intent(student_message: str) -> bool:
    """
    Detect if the student wants to conclude the session.
    Checks common voice phrases and variations.
    """
    if not student_message:
        return False

    msg = student_message.lower().strip()
    goodbye_phrases = [
        'bye',
        'goodbye',
        'good bye',
        'bye bye',
        'i have to go',
        'i gotta go',
        'got to go',
        'that is all',
        "that's all",
        'thats all',
        'stop',
        'end the session',
        'end session',
        'end call',
        'finish',
        'done for today',
        'i am done',
        "i'm done",
        'im done',
        'thank you bye',
        'thanks bye',
        'see you later',
        'see ya',
        'quit',
        'exit',
        'hang up',
    ]

    # Direct phrase check
    for phrase in goodbye_phrases:
        if re.search(r'\b' + re.escape(phrase) + r'\b', msg):
            return True

    return False


def generate_claude_tutor_response(session: LearningSession, student_message: str) -> tuple[str, str]:
    """
    Generates Socratic voice tutor response using Anthropic Claude Opus 5 via Azure AI Foundry.
    Returns (cleaned_voice_speech, model_name).
    """
    client = get_anthropic_client()
    if not client:
        logger.warning("AnthropicFoundry client not configured or unavailable.")
        return "", ""

    student = session.student
    topic = session.topic or "Fractions"
    deployment_name = getattr(settings, 'ANTHROPIC_AZURE_MODEL', 'claude-opus-5') or 'claude-opus-5'

    # Build alternating user/assistant message history for Anthropic API
    raw_history = list(session.messages.order_by('timestamp')[:14])
    messages = []

    # Initial turn to prime the conversation
    messages.append({
        "role": "user",
        "content": f"Hi Vani, I am {student.name} in Grade {student.grade}. I want to learn about {topic}."
    })

    last_role = "user"
    for m in raw_history:
        curr_role = "assistant" if m.role == 'tutor' else "user"
        if curr_role != last_role:
            messages.append({"role": curr_role, "content": m.content})
            last_role = curr_role
        else:
            # Consolidate sequential messages of the same role
            if messages:
                messages[-1]["content"] += f"\n{m.content}"

    # Add the current student message
    if last_role == "assistant":
        messages.append({"role": "user", "content": student_message})
    else:
        messages[-1]["content"] += f"\n{student_message}"

    system_instruction = (
        f"{VANI_SYSTEM_PROMPT}\n\n"
        f"Student Profile:\n"
        f"- Name: {student.name}\n"
        f"- Grade: {student.grade}\n"
        f"- Topic: {topic}\n\n"
        f"Voice Constraints:\n"
        f"- This will be converted directly to speech using text-to-speech for a live telephone call.\n"
        f"- Keep your response strictly to 1 or 2 spoken sentences (max 3 short sentences).\n"
        f"- Ask one guiding Socratic question or offer one small everyday analogy (e.g. sharing chapati, pizza, or chocolates).\n"
        f"- NO markdown, NO asterisks, NO bullet points, NO math symbols."
    )

    try:
        response = client.messages.create(
            model=deployment_name,
            system=system_instruction,
            messages=messages,
            max_tokens=1024,
        )

        # Extract only text blocks for speech synthesis (Claude thinking blocks are preserved internally)
        text_parts = [
            b.text for b in response.content
            if getattr(b, "type", "") == "text" or hasattr(b, "text")
        ]
        raw_text = " ".join(text_parts).strip()
        cleaned = clean_voice_text(raw_text)

        if cleaned:
            logger.info(f"Generated Claude Opus 5 voice response: '{cleaned[:60]}...'")
            return cleaned, deployment_name

    except Exception as e:
        logger.error(f"Error calling Claude Opus 5 in generate_claude_tutor_response: {e}")

    return "", ""


def generate_gemini_tutor_response(session: LearningSession, student_message: str) -> tuple[str, str]:
    """
    Generates Socratic voice tutor response using Google Gemini 3.6 Flash.
    Returns (cleaned_voice_speech, model_name).
    """
    client = get_gemini_client()
    if not client:
        logger.warning("Gemini client unavailable.")
        return "", ""

    student = session.student
    topic = session.topic or "Fractions"

    recent_messages = session.messages.order_by('timestamp')[:12]
    history_context = []
    for m in recent_messages:
        role_label = "Student" if m.role == 'student' else "Vani"
        history_context.append(f"{role_label}: {m.content}")

    history_str = "\n".join(history_context) if history_context else "No prior turns in this session."

    prompt = f"""Student Profile:
- Name: {student.name}
- Grade: {student.grade}
- Topic: {topic}
- Current Turn: {session.current_turn}

Conversation History so far:
{history_str}

Student's Latest Response:
"{student_message}"

Generate Vani's next response following all Socratic voice tutor rules:
- 1 to 3 short sentences spoken naturally.
- Acknowledge their response encouragingly.
- Ask one guided question or give a small intuitive hint using a simple real-world object.
- Do not give away the answer immediately.
- Plain conversational speech only, NO markdown."""

    try:
        config = types.GenerateContentConfig(
            system_instruction=VANI_SYSTEM_PROMPT,
            temperature=0.7,
            max_output_tokens=350,
        )

        response = client.models.generate_content(
            model=DEFAULT_GEMINI_MODEL,
            contents=prompt,
            config=config,
        )

        response_text = response.text if response and response.text else ""
        cleaned = clean_voice_text(response_text)
        if cleaned:
            return cleaned, DEFAULT_GEMINI_MODEL

    except Exception as e:
        logger.error(f"Error calling Gemini API in generate_gemini_tutor_response: {e}")

    return "", ""


def generate_tutor_response(session: LearningSession, student_message: str, model_choice: str = None) -> tuple[str, str]:
    """
    Generates dynamic Socratic response using Claude Opus 5 (Azure Anthropic Foundry)
    or Gemini 3.6 Flash, adhering strictly to voice rules (1-3 short spoken sentences).
    Returns tuple: (cleaned_voice_speech, model_used).
    """
    model_pref = (
        model_choice or
        getattr(session, 'model_choice', None) or
        'claude-opus-5'
    ).lower()

    # Prioritize Claude Opus 5 for deep Socratic pedagogy if selected or in hybrid mode
    if 'claude' in model_pref or 'opus' in model_pref or 'hybrid' in model_pref:
        speech_text, model_used = generate_claude_tutor_response(session, student_message)
        if speech_text:
            return speech_text, model_used
        logger.warning("Claude tutor response failed or was empty, falling back to Gemini 3.6 Flash.")

    # Try Gemini if selected or as reliable fallback
    speech_text, model_used = generate_gemini_tutor_response(session, student_message)
    if speech_text:
        return speech_text, model_used

    # In the unlikely event both LLMs fail, return polite conversational fallback
    topic = session.topic or "Fractions"
    fallback_response = (
        f"That is an interesting thought about {topic}. Let's look at it step by step. "
        "What do you think happens if you divide a whole piece into two equal parts?"
    )
    return fallback_response, "socratic-fallback"


def generate_claude_session_summary(session: LearningSession) -> dict:
    """
    Analyzes the entire learning session using Claude Opus 5 on Azure AI Foundry.
    Returns structured assessment dictionary.
    """
    client = get_anthropic_client()
    if not client:
        return {}

    student = session.student
    topic = session.topic or "Fractions"
    deployment_name = getattr(settings, 'ANTHROPIC_AZURE_MODEL', 'claude-opus-5') or 'claude-opus-5'

    messages = session.messages.order_by('timestamp')
    if not messages.exists():
        return {}

    transcript_lines = []
    for m in messages:
        speaker = student.name if m.role == 'student' else "Vani"
        transcript_lines.append(f"{speaker}: {m.content}")
    transcript = "\n".join(transcript_lines)

    prompt = f"""Review this voice tutoring session between Vani (tutor) and {student.name} (student) on the topic: {topic}.

Session Transcript:
{transcript}

Generate a concise assessment in strict JSON format with exactly these keys:
{{
  "concept_learned": "Short description of what concept was explored",
  "strengths": "Key concepts or reasoning the student grasped well",
  "areas_for_improvement": "Specific misunderstandings or areas needing practice",
  "recommended_next_step": "Actionable next practice topic or problem",
  "mastery_score": <integer from 0 to 100 representing estimated mastery>
}}

Return ONLY the raw JSON object. Do not include extra conversational text."""

    try:
        response = client.messages.create(
            model=deployment_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
        )

        text_parts = [
            b.text for b in response.content
            if getattr(b, "type", "") == "text" or hasattr(b, "text")
        ]
        raw_text = "".join(text_parts).strip()
        # Strip markdown code fences if any
        if '```json' in raw_text:
            raw_text = raw_text.split('```json')[1].split('```')[0].strip()
        elif '```' in raw_text:
            raw_text = raw_text.split('```')[1].split('```')[0].strip()

        parsed = json.loads(raw_text)
        return {
            "concept_learned": str(parsed.get("concept_learned", "")),
            "strengths": str(parsed.get("strengths", "")),
            "areas_for_improvement": str(parsed.get("areas_for_improvement", "")),
            "recommended_next_step": str(parsed.get("recommended_next_step", "")),
            "mastery_score": int(parsed.get("mastery_score", 75)),
            "evaluator_model": deployment_name,
        }
    except Exception as e:
        logger.error(f"Error generating session summary with Claude Opus 5: {e}")

    return {}


def generate_gemini_session_summary(session: LearningSession) -> dict:
    """
    Analyzes the learning session using Google Gemini 3.6 Flash.
    """
    client = get_gemini_client()
    if not client:
        return {}

    student = session.student
    topic = session.topic or "Fractions"

    messages = session.messages.order_by('timestamp')
    if not messages.exists():
        return {}

    transcript_lines = []
    for m in messages:
        speaker = student.name if m.role == 'student' else "Vani"
        transcript_lines.append(f"{speaker}: {m.content}")
    transcript = "\n".join(transcript_lines)

    prompt = f"""Review this voice tutoring session between Vani (tutor) and {student.name} (student) on the topic: {topic}.

Session Transcript:
{transcript}

Generate a concise assessment in JSON format with exactly these keys:
{{
  "concept_learned": "Short description of what concept was explored",
  "strengths": "Key concepts or reasoning the student grasped well",
  "areas_for_improvement": "Specific misunderstandings or areas needing practice",
  "recommended_next_step": "Actionable next practice topic or problem",
  "mastery_score": <integer from 0 to 100 representing estimated mastery>
}}

Return ONLY the raw JSON object. No markdown block."""

    try:
        config = types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=800,
            response_mime_type="application/json",
        )

        response = client.models.generate_content(
            model=DEFAULT_GEMINI_MODEL,
            contents=prompt,
            config=config,
        )

        raw_json = response.text.strip() if response and response.text else "{}"
        parsed = json.loads(raw_json)

        return {
            "concept_learned": str(parsed.get("concept_learned", "")),
            "strengths": str(parsed.get("strengths", "")),
            "areas_for_improvement": str(parsed.get("areas_for_improvement", "")),
            "recommended_next_step": str(parsed.get("recommended_next_step", "")),
            "mastery_score": int(parsed.get("mastery_score", 75)),
            "evaluator_model": DEFAULT_GEMINI_MODEL,
        }
    except Exception as e:
        logger.error(f"Error generating session summary with Gemini: {e}")

    return {}


def generate_session_summary(session: LearningSession, model_choice: str = None) -> dict:
    """
    Analyzes the entire learning session and generates a learning summary:
    - concept_learned
    - strengths
    - areas_for_improvement
    - recommended_next_step
    - mastery_score (0-100)
    - evaluator_model
    """
    topic = session.topic or "Fractions"
    student = session.student

    default_summary = {
        "concept_learned": f"Explored foundational concepts of {topic}.",
        "strengths": "Showed active curiosity and engaged with guided questions.",
        "areas_for_improvement": f"Practice comparing different values and denominators in {topic}.",
        "recommended_next_step": f"Continue practicing basic {topic} problems with visual examples.",
        "mastery_score": 75,
        "evaluator_model": "rule-engine",
    }

    model_pref = (
        model_choice or
        getattr(session, 'model_choice', None) or
        'claude-opus-5'
    ).lower()

    summary = {}
    if 'claude' in model_pref or 'opus' in model_pref:
        summary = generate_claude_session_summary(session)

    if not summary:
        summary = generate_gemini_session_summary(session)

    if not summary and 'claude' not in model_pref:
        summary = generate_claude_session_summary(session)

    if not summary:
        return default_summary

    return {
        "concept_learned": summary.get("concept_learned") or default_summary["concept_learned"],
        "strengths": summary.get("strengths") or default_summary["strengths"],
        "areas_for_improvement": summary.get("areas_for_improvement") or default_summary["areas_for_improvement"],
        "recommended_next_step": summary.get("recommended_next_step") or default_summary["recommended_next_step"],
        "mastery_score": int(summary.get("mastery_score", 75)),
        "evaluator_model": summary.get("evaluator_model", "claude-opus-5"),
    }


def finalize_session_and_progress(session: LearningSession, model_choice: str = None) -> SessionSummary:
    """
    Marks session as completed, generates summary with Claude / Gemini, saves SessionSummary,
    and updates or creates the student's Progress record.
    """
    from django.utils import timezone

    session.status = 'completed'
    session.ended_at = timezone.now()
    session.save(update_fields=['status', 'ended_at'])

    # Generate or fetch summary
    summary_data = generate_session_summary(session, model_choice=model_choice)

    session_summary, _ = SessionSummary.objects.update_or_create(
        session=session,
        defaults={
            'concept_learned': summary_data['concept_learned'],
            'strengths': summary_data['strengths'],
            'areas_for_improvement': summary_data['areas_for_improvement'],
            'recommended_next_step': summary_data['recommended_next_step'],
            'mastery_score': summary_data['mastery_score'],
            'evaluator_model': summary_data.get('evaluator_model', ''),
        }
    )

    # Update or create Progress
    student = session.student
    topic = session.topic or "Fractions"
    progress, created = Progress.objects.get_or_create(
        student=student,
        topic=topic,
        defaults={
            'mastery_score': summary_data['mastery_score'],
            'sessions_completed': 1,
        }
    )

    if not created:
        progress.sessions_completed += 1
        # Weighted average score with latest session
        progress.mastery_score = int((progress.mastery_score + summary_data['mastery_score']) / 2)
        progress.save(update_fields=['sessions_completed', 'mastery_score', 'last_studied'])

    logger.info(
        f"Finalized session #{session.id} for student {student.name}. "
        f"Mastery: {session_summary.mastery_score}% [Evaluator: {session_summary.evaluator_model}]"
    )
    return session_summary
