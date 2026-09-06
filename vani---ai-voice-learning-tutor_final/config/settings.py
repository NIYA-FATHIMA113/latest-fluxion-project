"""
Django settings for Vani AI Voice Learning Tutor.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.getenv(
    'DJANGO_SECRET_KEY',
    'django-insecure-vani-ai-voice-tutor-hackathon-secret-key-2026'
)

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = ['*']

CSRF_TRUSTED_ORIGINS = [
    'https://*.ngrok-free.app',
    'https://*.ngrok.io',
    'https://*.ngrok.app',
    'https://*.run.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'students',
    'learning',
    'telephony',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database: SQLite db.sqlite3
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Gemini API & Twilio Voice Configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-3.6-flash')

# Anthropic Azure AI Foundry Configuration
ANTHROPIC_AZURE_ENDPOINT = os.getenv('ANTHROPIC_AZURE_ENDPOINT', 'https://startuperbyaries.services.ai.azure.com/anthropic')
ANTHROPIC_AZURE_API_KEY = os.getenv('ANTHROPIC_AZURE_API_KEY', '')
ANTHROPIC_AZURE_MODEL = os.getenv('ANTHROPIC_AZURE_MODEL', 'claude-opus-5')

TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '')
TWILIO_VALIDATE_SIGNATURE = os.getenv('TWILIO_VALIDATE_SIGNATURE', 'False').lower() in ('true', '1')

# Default Voice configuration for Twilio (Indian English preferred)
TWILIO_VOICE = 'Polly.Aditi'
TWILIO_VOICE_LANGUAGE = 'en-IN'
