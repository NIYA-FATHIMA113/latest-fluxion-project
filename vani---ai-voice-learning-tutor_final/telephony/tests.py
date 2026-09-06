from unittest.mock import patch, MagicMock
from django.test import TestCase, Client
from django.urls import reverse
from students.models import Student, Progress
from learning.models import LearningSession, Message, SessionSummary

class VaniTelephonyTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.phone_number = "+919876543210"
        self.call_sid = "CAtest12345"

    def test_01_health_endpoint(self):
        """Test GET /api/health/ returns status healthy."""
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertEqual(data.get("service"), "Vani API")

    def test_02_incoming_twilio_call_creates_student_and_session(self):
        """Test incoming Twilio call creates student, session, and initial greeting."""
        response = self.client.post('/api/telephony/voice/incoming/', {
            'From': self.phone_number,
            'CallSid': self.call_sid,
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('application/xml', response['Content-Type'])

        # Check Student was created
        student = Student.objects.filter(phone_number=self.phone_number).first()
        self.assertIsNotNone(student)
        self.assertEqual(student.name, "Ravi Sharma")

        # Check LearningSession was created
        session = LearningSession.objects.filter(call_sid=self.call_sid, status='active').first()
        self.assertIsNotNone(session)
        self.assertEqual(session.student, student)
        self.assertEqual(session.topic, "Fractions")

        # Check initial greeting message was saved
        first_msg = Message.objects.filter(session=session).first()
        self.assertIsNotNone(first_msg)
        self.assertEqual(first_msg.role, 'tutor')
        self.assertIn("Ravi", first_msg.content)

        # Check TwiML output
        xml_content = response.content.decode('utf-8')
        self.assertIn("<Gather", xml_content)
        self.assertIn("/api/telephony/voice/interact/", xml_content)
        self.assertIn("Polly.Aditi", xml_content)

    @patch('telephony.views.generate_tutor_response')
    def test_03_speech_result_processing_and_conversation_memory(self, mock_generate):
        """Test interactive speech turn saves student & tutor messages and returns TwiML."""
        mock_generate.return_value = "Exactly! Now imagine the pizza is divided between four people. Is each slice bigger or smaller?"

        # 1. Setup incoming call
        self.client.post('/api/telephony/voice/incoming/', {
            'From': self.phone_number,
            'CallSid': self.call_sid,
        })
        session = LearningSession.objects.get(call_sid=self.call_sid)

        # 2. Student speaks
        response = self.client.post(
            f'/api/telephony/voice/interact/?session_id={session.id}',
            {
                'CallSid': self.call_sid,
                'SpeechResult': 'Half.',
            }
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('application/xml', response['Content-Type'])

        # Check student message was saved
        student_msg = Message.objects.filter(session=session, role='student').first()
        self.assertIsNotNone(student_msg)
        self.assertEqual(student_msg.content, 'Half.')

        # Check tutor message was saved
        tutor_msg = Message.objects.filter(session=session, role='tutor').last()
        self.assertIsNotNone(tutor_msg)
        self.assertIn("pizza is divided between four people", tutor_msg.content)

        # Check turn count incremented
        session.refresh_from_db()
        self.assertEqual(session.current_turn, 1)

        # Check TwiML maintains continuous Gather loop
        xml_content = response.content.decode('utf-8')
        self.assertIn("<Gather", xml_content)
        self.assertIn("Polly.Aditi", xml_content)

    @patch('learning.services.generate_session_summary')
    def test_04_goodbye_detection_and_progress_update(self, mock_summary):
        """Test student saying goodbye completes session, generates summary, and updates Progress."""
        mock_summary.return_value = {
            "concept_learned": "Comparing unit fractions with different denominators",
            "strengths": "Understood that more slices means smaller portions",
            "areas_for_improvement": "Needs practice with mixed numbers",
            "recommended_next_step": "Practice comparing 3/4 and 2/3",
            "mastery_score": 82,
        }

        # Initialize session
        self.client.post('/api/telephony/voice/incoming/', {
            'From': self.phone_number,
            'CallSid': self.call_sid,
        })
        session = LearningSession.objects.get(call_sid=self.call_sid)

        # Student says goodbye
        response = self.client.post(
            f'/api/telephony/voice/interact/?session_id={session.id}',
            {
                'CallSid': self.call_sid,
                'SpeechResult': 'Thank you so much, goodbye!',
            }
        )
        self.assertEqual(response.status_code, 200)

        # Check session completed
        session.refresh_from_db()
        self.assertEqual(session.status, 'completed')
        self.assertIsNotNone(session.ended_at)

        # Check SessionSummary created
        summary = SessionSummary.objects.filter(session=session).first()
        self.assertIsNotNone(summary)
        self.assertEqual(summary.mastery_score, 82)
        self.assertEqual(summary.concept_learned, "Comparing unit fractions with different denominators")

        # Check Progress record created/updated
        student = session.student
        progress = Progress.objects.filter(student=student, topic="Fractions").first()
        self.assertIsNotNone(progress)
        self.assertGreaterEqual(progress.sessions_completed, 1)

        # Check TwiML issues Hangup
        xml_content = response.content.decode('utf-8')
        self.assertIn("<Hangup", xml_content)

    def test_05_empty_speech_handling(self):
        """Test silence / empty SpeechResult prompts student and re-gathers speech."""
        self.client.post('/api/telephony/voice/incoming/', {
            'From': self.phone_number,
            'CallSid': self.call_sid,
        })
        session = LearningSession.objects.get(call_sid=self.call_sid)

        response = self.client.post(
            f'/api/telephony/voice/interact/?session_id={session.id}',
            {
                'CallSid': self.call_sid,
                'SpeechResult': '',
            }
        )
        self.assertEqual(response.status_code, 200)
        xml_content = response.content.decode('utf-8')
        self.assertIn("<Gather", xml_content)
        self.assertIn("didn't quite catch that", xml_content)

    @patch('learning.services.generate_session_summary')
    def test_06_explicit_goodbye_endpoint(self, mock_summary):
        """Test POST /api/telephony/voice/goodbye/ terminates active call."""
        mock_summary.return_value = {
            "concept_learned": "Fractions basics",
            "strengths": "Quick responses",
            "areas_for_improvement": "None",
            "recommended_next_step": "Advanced fractions",
            "mastery_score": 90,
        }
        self.client.post('/api/telephony/voice/incoming/', {
            'From': self.phone_number,
            'CallSid': self.call_sid,
        })
        session = LearningSession.objects.get(call_sid=self.call_sid)

        response = self.client.post(
            f'/api/telephony/voice/goodbye/?session_id={session.id}',
            {'CallSid': self.call_sid}
        )
        self.assertEqual(response.status_code, 200)
        xml_content = response.content.decode('utf-8')
        self.assertIn("<Hangup", xml_content)

        session.refresh_from_db()
        self.assertEqual(session.status, 'completed')

    def test_07_rest_inspection_endpoints(self):
        """Test inspection endpoints for sessions, messages, students, and progress."""
        # Setup student, session, messages
        student = Student.objects.create(name="Ananya", phone_number="+919123456789", grade="9")
        session = LearningSession.objects.create(student=student, topic="Algebra", status="active")
        m1 = Message.objects.create(session=session, role="tutor", content="What is x?")
        m2 = Message.objects.create(session=session, role="student", content="x is five.")
        Progress.objects.create(student=student, topic="Algebra", mastery_score=85, sessions_completed=1)

        # GET /api/students/<id>/
        r_student = self.client.get(f'/api/students/{student.id}/')
        self.assertEqual(r_student.status_code, 200)
        self.assertEqual(r_student.json()['name'], "Ananya")

        # GET /api/progress/<student_id>/
        r_prog = self.client.get(f'/api/progress/{student.id}/')
        self.assertEqual(r_prog.status_code, 200)
        self.assertEqual(len(r_prog.json()['progress']), 1)

        # GET /api/sessions/<id>/
        r_sess = self.client.get(f'/api/sessions/{session.id}/')
        self.assertEqual(r_sess.status_code, 200)
        self.assertEqual(r_sess.json()['topic'], "Algebra")

        # GET /api/sessions/<id>/messages/
        r_msg = self.client.get(f'/api/sessions/{session.id}/messages/')
        self.assertEqual(r_msg.status_code, 200)
        self.assertEqual(r_msg.json()['total_messages'], 2)
