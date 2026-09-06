from unittest.mock import patch, MagicMock
from django.test import TestCase
from students.models import Student
from learning.models import LearningSession, Message
from learning.services import (
    clean_voice_text,
    is_goodbye_intent,
    generate_tutor_response,
    generate_session_summary,
)

class LearningServiceTests(TestCase):
    def setUp(self):
        self.student = Student.objects.create(name="Ravi Sharma", phone_number="+919876543210")
        self.session = LearningSession.objects.create(student=self.student, topic="Fractions")

    def test_clean_voice_text(self):
        raw = "### Hello **Ravi**! Here is a list:\n* item 1\n* item 2\n`code`"
        cleaned = clean_voice_text(raw)
        self.assertNotIn("**", cleaned)
        self.assertNotIn("###", cleaned)
        self.assertNotIn("`", cleaned)
        self.assertIn("Hello Ravi!", cleaned)

    def test_is_goodbye_intent(self):
        self.assertTrue(is_goodbye_intent("goodbye"))
        self.assertTrue(is_goodbye_intent("bye for now"))
        self.assertTrue(is_goodbye_intent("I have to go now"))
        self.assertTrue(is_goodbye_intent("Thank you, bye"))
        self.assertTrue(is_goodbye_intent("Stop"))
        self.assertFalse(is_goodbye_intent("One half"))
        self.assertFalse(is_goodbye_intent("Why is one fourth smaller?"))
        self.assertFalse(is_goodbye_intent("Can you give me a hint?"))

    @patch('learning.services.get_gemini_client')
    def test_generate_tutor_response_success(self, mock_get_client):
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = "Good job! If four friends share the pizza, does each person get more or less?"
        mock_client.models.generate_content.return_value = mock_resp
        mock_get_client.return_value = mock_client

        reply, model_used = generate_tutor_response(self.session, "Half.", model_choice="gemini-3.6-flash")
        self.assertIn("four friends share the pizza", reply)
        self.assertEqual(model_used, "gemini-3.6-flash")

    @patch('learning.services.get_anthropic_client')
    def test_generate_claude_tutor_response_success(self, mock_get_client):
        mock_client = MagicMock()
        mock_msg = MagicMock()
        mock_block = MagicMock()
        mock_block.type = "text"
        mock_block.text = "Wonderful! If you have four slices, what happens?"
        mock_msg.content = [mock_block]
        mock_client.messages.create.return_value = mock_msg
        mock_get_client.return_value = mock_client

        reply, model_used = generate_tutor_response(self.session, "Half.", model_choice="claude-opus-5")
        self.assertIn("four slices", reply)
        self.assertEqual(model_used, "claude-opus-5")

    @patch('learning.services.get_gemini_client')
    @patch('learning.services.get_anthropic_client')
    def test_generate_tutor_response_fallback_on_error(self, mock_anthropic, mock_gemini):
        mock_anthropic.return_value = None
        mock_gemini.return_value = None

        # Ensure call does NOT crash
        reply, model_used = generate_tutor_response(self.session, "Half.")
        self.assertIsNotNone(reply)
        self.assertIn("equal parts", reply)
