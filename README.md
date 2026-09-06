# 📚 LearnLoop

**LearnLoop** is an AI-powered voice learning assistant that allows students to learn concepts through an interactive phone conversation.

Instead of requiring a web interface, LearnLoop uses **Twilio Voice** to connect students directly to an AI-powered Django backend. The student can call the system, choose a language, select a topic, answer questions verbally, and receive feedback through the phone call.

---

## 🚀 Problem Statement

Many students struggle with traditional learning methods because they are often passive and one-directional.

Students may read notes or watch videos, but they don't always get an opportunity to:

* Explain concepts in their own words
* Test their understanding immediately
* Receive personalized feedback
* Learn in a conversational way
* Study without depending on a graphical interface

LearnLoop addresses this by turning learning into an **interactive voice conversation**.

---

## 💡 Proposed Solution

LearnLoop acts as a voice-based AI tutor.

A student simply calls the LearnLoop number and interacts with the system using their voice.

### Basic Flow

```text
Student
   ↓
Phone Call
   ↓
Twilio Voice
   ↓
Django Backend
   ↓
AI Tutor
   ↓
Question / Explanation
   ↓
Student's Voice Answer
   ↓
Speech Recognition
   ↓
AI Evaluation
   ↓
Feedback / Next Question
```

The system can adapt the learning experience based on the student's responses.

---

## ✨ Features

* 📞 **Voice-based learning**
* 🤖 **AI-powered tutoring**
* 🗣️ **Interactive conversation**
* 🎤 **Speech-based answers**
* 🌐 **Language selection**
* 📖 **Topic-based learning**
* 🧠 **Concept understanding checks**
* 💬 **Instant feedback**
* 🔄 **Adaptive teaching flow**
* 🚫 **No frontend required**

---

## 🛠️ Tech Stack

### Backend

* Python
* Django

### Voice & Communication

* Twilio Voice
* Twilio `<Gather>`
* Speech recognition through Twilio

### AI

* AI-powered question generation
* Answer evaluation
* Personalized feedback
* Adaptive teaching

### Development Tools

* Git
* GitHub
* Ngrok (for local webhook testing)

---

## 📂 Project Structure

```text
learnloop/
│
├── manage.py
│
├── learnloop/
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
│
├── voice/
│   ├── views.py
│   ├── urls.py
│   ├── models.py
│   └── ...
│
├── requirements.txt
└── README.md
```

---

## 🔄 Voice Interaction Flow

### 1. Incoming Call

The student calls the LearnLoop Twilio phone number.

Twilio sends the incoming call request to the Django backend.

```text
/voice/incoming/
```

The Django backend generates TwiML using Twilio's `VoiceResponse`.

---

### 2. Language Selection

The student is asked to select their preferred language.

The system can support voice interaction using languages such as English and native languages depending on the configured speech/voice services.

---

### 3. Topic Selection

The student chooses the topic they want to learn.

For example:

```text
Student: "I want to learn about photosynthesis."

LearnLoop:
"Great! Let's learn about photosynthesis."
```

---

### 4. AI Teaching

The AI tutor explains the concept conversationally instead of simply displaying information.

The tutor can ask questions to determine whether the student understands the concept.

---

### 5. Student Answer

The student responds verbally.

Twilio's `<Gather>` captures the student's speech.

The recognized speech is received by Django through:

```python
request.POST.get("SpeechResult")
```

---

### 6. Answer Evaluation

The backend processes the student's answer and determines whether the student understands the concept.

Based on the response, LearnLoop can:

* Give positive feedback
* Correct misconceptions
* Explain the concept again
* Ask a simpler question
* Ask a follow-up question
* Move to the next concept

---

## 🔊 Twilio Voice

LearnLoop uses Twilio's programmable voice capabilities to create the phone conversation.

The Django backend generates TwiML responses such as:

```python
from twilio.twiml.voice_response import VoiceResponse, Gather

response = VoiceResponse()

gather = Gather(
    input="speech",
    action="/voice/answer/",
    method="POST"
)

gather.say(
    "Tell me what you know about this topic.",
    voice="alice",
    language="en-IN"
)

response.append(gather)
```

The student's spoken response is then sent back to the Django backend.

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/NIYA-FATHIMA113/latest-fluxion-project.git
```

```bash
cd latest-fluxion-project
```

### 2. Create a virtual environment

Windows:

```bash
python -m venv venv
```

Activate it:

```bash
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run migrations

```bash
python manage.py migrate
```

### 5. Start Django

```bash
python manage.py runserver
```

---

## 🌍 Local Twilio Testing

Since Twilio needs to access the Django server from the internet, a tunneling service such as **ngrok** can be used during local development.

Example:

```bash
ngrok http 8000
```

This provides a public HTTPS URL.

The Twilio webhook can then point to:

```text
https://YOUR-NGROK-URL/voice/incoming/
```

---

## 🔐 Environment Variables

Sensitive credentials should not be committed to GitHub.

Create a `.env` file and add the required credentials, for example:

```env
SECRET_KEY=your_django_secret_key

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

AI_API_KEY=your_ai_api_key
```

Make sure `.env` is included in `.gitignore`.

---

## 📡 API / Voice Endpoints

| Endpoint           | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `/voice/incoming/` | Handles incoming calls                             |
| `/voice/language/` | Handles language selection                         |
| `/voice/topic/`    | Handles topic selection                            |
| `/voice/answer/`   | Receives and processes the student's spoken answer |

The exact endpoints may change as the project develops.

---

## 🧪 Testing

Start the Django development server:

```bash
python manage.py runserver
```

Then expose it using ngrok:

```bash
ngrok http 8000
```

Configure the Twilio phone number's voice webhook to the public URL:

```text
https://YOUR-NGROK-URL/voice/incoming/
```

Call the Twilio number and test the complete conversation.

---

## 🎯 Hackathon Objective

LearnLoop was designed as an **overnight hackathon MVP** demonstrating how AI, voice communication, and backend technologies can be combined to create an accessible learning experience.

The key idea is simple:

> **Call. Learn. Speak. Understand. Repeat.**

---

## 🔮 Future Improvements

* Personalized student learning profiles
* Progress tracking
* Multiple subjects and topics
* More regional language support
* Improved AI-based answer evaluation
* Difficulty adaptation
* Student performance analytics
* Persistent learning history
* More natural conversational AI
* Integration with educational content

---

## 👩‍💻 Team

**LearnLoop — AI Voice Learning Assistant**

Built as a hackathon project using Django, Twilio Voice, and AI.

---

## 📄 License

This project is currently intended as a hackathon prototype.
