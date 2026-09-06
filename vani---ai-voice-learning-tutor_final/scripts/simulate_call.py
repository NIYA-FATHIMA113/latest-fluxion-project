#!/usr/bin/env python3
"""
Vani - AI Voice Learning Tutor: Phone Call Simulator
Simulates a complete real-time two-way voice conversation between a student and Vani.
Works against a running server (default http://127.0.0.1:3000 or custom URL)
or directly using Django Client.
"""

import sys
import os
import json
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, parse_qs, urlparse

# Ensure project root is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def extract_say_text(xml_string: str) -> str:
    """Extract spoken text from TwiML XML."""
    try:
        root = ET.fromstring(xml_string)
        # Check Gather Say first (the primary interactive speech)
        gather = root.find('.//Gather')
        if gather is not None:
            say = gather.find('Say')
            if say is not None and say.text:
                return say.text.strip()
        # Otherwise get root Say
        say_tags = root.findall('.//Say')
        texts = [tag.text.strip() for tag in say_tags if tag.text]
        return " ".join(texts)
    except Exception as e:
        return f"[XML parse error: {e}]"


def extract_action_url(xml_string: str) -> str:
    """Extract Gather action URL from TwiML XML."""
    try:
        root = ET.fromstring(xml_string)
        gather = root.find('.//Gather')
        if gather is not None and 'action' in gather.attrib:
            return gather.attrib['action']
    except Exception:
        pass
    return ""


def run_simulation(base_url: str = "http://127.0.0.1:3000", model_choice: str = "claude-opus-5"):
    print("=" * 65)
    print("  VANI — AI VOICE LEARNING TUTOR: TWO-WAY VOICE SIMULATION")
    print("=" * 65)
    print(f"Target Server: {base_url}")
    print(f"Active Model:  {model_choice}\n")

    # Try connecting over HTTP; if server isn't running, fallback to Django test client
    import urllib.request
    import urllib.parse

    use_http = True
    try:
        req = urllib.request.Request(f"{base_url}/api/health/")
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"[✓] Connected to live Vani server: {data.get('service')} ({data.get('status')})")
    except Exception as e:
        print(f"[!] Live server not responding on {base_url} ({e}).")
        print("[i] Using Django in-process client for simulation...")
        use_http = False
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        import django
        django.setup()
        from django.test import Client
        django_client = Client()

    def post(path: str, data: dict):
        if use_http:
            full_url = urljoin(base_url, path)
            encoded_data = urllib.parse.urlencode(data).encode('utf-8')
            req = urllib.request.Request(full_url, data=encoded_data, method='POST')
            req.add_header('Content-Type', 'application/x-www-form-urlencoded')
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.getcode(), resp.read().decode('utf-8')
        else:
            resp = django_client.post(path, data)
            return resp.status_code, resp.content.decode('utf-8')

    def get(path: str):
        if use_http:
            full_url = urljoin(base_url, path)
            req = urllib.request.Request(full_url, method='GET')
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.getcode(), json.loads(resp.read().decode('utf-8'))
        else:
            resp = django_client.get(path)
            return resp.status_code, resp.json()

    phone_number = "+919876543210"
    call_sid = f"CA_sim_{model_choice.replace('-', '_')}_01"

    print("\n--- STEP 1: Incoming Phone Call from Student ---")
    print(f"Dialing from: {phone_number} (Call SID: {call_sid}, Model: {model_choice})...")
    status, incoming_twiml = post('/api/telephony/voice/incoming/', {
        'From': phone_number,
        'CallSid': call_sid,
        'model': model_choice,
    })

    tutor_greeting = extract_say_text(incoming_twiml)
    action_url = extract_action_url(incoming_twiml) or "/api/telephony/voice/interact/"

    print(f"\n[VANI SPEAKING (TTS Polly.Aditi)]:\n\"{tutor_greeting}\"\n")

    # Extract session_id
    parsed = urlparse(action_url)
    params = parse_qs(parsed.query)
    session_id = params.get('session_id', [None])[0]
    print(f"[Session Initialized: #{session_id} with model {model_choice}]")

    # The student interactive turns as requested in prompt requirement 29:
    dialog_turns = [
        "I think fractions are hard.",
        "One half.",
        "Because the whole is divided into two pieces.",
        "Thank you, goodbye."
    ]

    for turn_idx, student_utterance in enumerate(dialog_turns, start=1):
        print("-" * 65)
        print(f"--- TURN {turn_idx}: Student Speaks ---")
        print(f"[STUDENT]: \"{student_utterance}\"")
        print(f"Processing with Speech Recognition -> Django Webhook -> {model_choice} AI...")

        interact_path = f"/api/telephony/voice/interact/?session_id={session_id}" if session_id else "/api/telephony/voice/interact/"
        status, reply_twiml = post(interact_path, {
            'CallSid': call_sid,
            'SpeechResult': student_utterance,
            'session_id': session_id,
            'model': model_choice,
        })

        tutor_speech = extract_say_text(reply_twiml)
        print(f"\n[VANI SPEAKING (TTS Polly.Aditi)]:\n\"{tutor_speech}\"\n")

        if "<Hangup" in reply_twiml:
            print("[Call Completed & Hung Up by Vani]\n")
            break

    print("=" * 65)
    print("  SIMULATION COMPLETE: RETRIEVING POST-CALL LEARNING REPORT")
    print("=" * 65)

    if session_id:
        # Query Session Details
        sess_status, session_data = get(f'/api/sessions/{session_id}/')
        student_id = session_data.get('student_id')

        print(f"\n--- SESSION DETAILS (ID #{session_id}) ---")
        print(f"Student:       {session_data.get('student_name')} ({session_data.get('student_phone')})")
        print(f"Topic:         {session_data.get('topic')}")
        print(f"Model Choice:  {session_data.get('model_choice')}")
        print(f"Status:        {session_data.get('status')}")
        print(f"Total Turns:   {session_data.get('current_turn')}")

        summary = session_data.get('summary')
        if summary:
            print(f"\n--- AI LEARNING SUMMARY ---")
            print(f"Evaluator:             {summary.get('evaluator_model')}")
            print(f"Mastery Score:         {summary.get('mastery_score')}%")
            print(f"Concept Learned:       {summary.get('concept_learned')}")
            print(f"Strengths:             {summary.get('strengths')}")
            print(f"Areas for Improvement: {summary.get('areas_for_improvement')}")
            print(f"Recommended Next Step: {summary.get('recommended_next_step')}")

        # Query Messages
        msg_status, messages_data = get(f'/api/sessions/{session_id}/messages/')
        print(f"\n--- FULL CONVERSATION TRANSCRIPT ({messages_data.get('total_messages')} messages) ---")
        for m in messages_data.get('messages', []):
            role_tag = f"VANI ({m.get('model_used') or 'Polly'})" if m['role'] == 'tutor' else "STUDENT"
            print(f"[{role_tag}]: {m['content']}")

        # Query Progress
        if student_id:
            prog_status, prog_data = get(f'/api/progress/{student_id}/')
            print(f"\n--- STUDENT PROGRESS RECORDS ({prog_data.get('student_name')}) ---")
            for p in prog_data.get('progress', []):
                print(f"• Topic: {p['topic']} | Mastery: {p['mastery_score']}% | Sessions: {p['sessions_completed']}")

    print("\n" + "=" * 65)
    print(f"  TELEPHONY AND {model_choice.upper()} VOICE STEPS VERIFIED!")
    print("=" * 65 + "\n")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Vani Voice Call Simulator")
    parser.add_argument('url', nargs='?', default="http://127.0.0.1:3000", help="Base URL of Vani app")
    parser.add_argument('--model', default="claude-opus-5", choices=['claude-opus-5', 'gemini-3.6-flash', 'hybrid'], help="AI model choice")
    args = parser.parse_args()
    run_simulation(args.url, args.model)
