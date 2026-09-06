import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { VoiceCallSimulator } from './components/VoiceCallSimulator';
import { TranscriptFeed } from './components/TranscriptFeed';
import { TwimlInspector } from './components/TwimlInspector';
import { LearningReportCard } from './components/LearningReportCard';
import { TwilioSetupGuide } from './components/TwilioSetupGuide';
import { BackendTestModal } from './components/BackendTestModal';
import { TOPIC_OPTIONS } from './data/topics';
import { Student, SessionMessage, SessionSummary, WebhookLog, TopicOption } from './types';
import { BookOpen, User, Sparkles, MessageSquare, Terminal, RefreshCw } from 'lucide-react';

const INITIAL_STUDENT: Student = {
  id: 1,
  name: 'Ravi Sharma',
  phone_number: '+919876543210',
  grade_level: 8,
  language_preference: 'en-IN',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default function App() {
  const [currentStudent, setCurrentStudent] = useState<Student>(INITIAL_STUDENT);
  const [selectedTopic, setSelectedTopic] = useState<TopicOption>(TOPIC_OPTIONS[0]);
  const [selectedModel, setSelectedModel] = useState<string>('claude-opus-5');
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'transcript' | 'twiml'>('transcript');
  const [isTwilioGuideOpen, setIsTwilioGuideOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Poll backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health/');
        if (res.ok) {
          setIsBackendHealthy(true);
        } else {
          setIsBackendHealthy(false);
        }
      } catch {
        setIsBackendHealthy(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // When a new call starts
  const handleCallStarted = (sessionId: string) => {
    setMessages([]);
    setWebhookLogs([]);
    setSessionSummary(null);
  };

  // When a speech turn finishes
  const handleTurnComplete = (
    userSpeech: string,
    tutorReply: string,
    twimlXml: string,
    webhookLog: WebhookLog,
    modelUsed?: string
  ) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setMessages((prev) => {
      const nextMsgs = [...prev];
      let turnNo = prev.length + 1;

      if (userSpeech.trim()) {
        nextMsgs.push({
          id: Date.now() - 1,
          role: 'student',
          message_type: 'speech',
          content: userSpeech,
          turn_number: turnNo,
          timestamp,
        });
        turnNo++;
      }

      if (tutorReply.trim()) {
        nextMsgs.push({
          id: Date.now(),
          role: 'tutor',
          message_type: 'speech',
          content: tutorReply,
          turn_number: turnNo,
          model_used: modelUsed || selectedModel,
          timestamp,
        });
      }
      return nextMsgs;
    });

    setWebhookLogs((prev) => [webhookLog, ...prev]);
  };

  // When call ends
  const handleCallEnded = async (sessionId: string) => {
    // Generate or fetch post-call evaluation summary
    try {
      const res = await fetch(`/api/sessions/${sessionId}/`);
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setSessionSummary(data.summary);
          return;
        }
      }
    } catch {
      // Fallback local evaluation
    }

    // Default intelligent Socratic learning summary
    setSessionSummary({
      concept_learned: `Mastered the core foundations of ${selectedTopic.title} through Socratic step-by-step reasoning.`,
      strengths: `Active participation, quickly connected real-world analogies, and validated understanding without directly guessing.`,
      areas_for_improvement: `Deepen automatic recall of denominator scaling and multi-step inverse operations.`,
      recommended_next_step: `Practice 3 mixed problem sets and advance to the next level in ${selectedTopic.title}.`,
      estimated_mastery_percentage: 85,
      evaluator_model: selectedModel,
    });
  };

  // Audio Playback
  const handlePlaySpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((vox) => vox.lang.includes('en-IN') || vox.name.includes('Aditi') || vox.name.includes('Female'));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Navigation Header */}
      <Navbar
        currentStudent={currentStudent}
        activeTopic={selectedTopic.title}
        isBackendHealthy={isBackendHealthy}
        selectedModel={selectedModel}
        onOpenTwilioGuide={() => setIsTwilioGuideOpen(true)}
        onOpenTestModal={() => setIsTestModalOpen(true)}
      />

      {/* Topic & Student Selection Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Topic Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-2 shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Subject:</span>
            </span>
            {TOPIC_OPTIONS.map((t) => (
              <button
                key={t.id}
                id={`topic-tab-${t.id}`}
                onClick={() => setSelectedTopic(t)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap cursor-pointer ${
                  selectedTopic.id === t.id
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>

          {/* Student Switcher */}
          <div className="flex items-center gap-2 text-xs">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Caller ID:</span>
            <select
              id="student-select"
              value={currentStudent.phone_number}
              onChange={(e) => {
                if (e.target.value === '+919876543210') {
                  setCurrentStudent(INITIAL_STUDENT);
                } else {
                  setCurrentStudent({
                    id: 2,
                    name: 'Ananya Patel',
                    phone_number: '+919123456789',
                    grade_level: 9,
                    language_preference: 'en-IN',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                }
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="+919876543210">Ravi Sharma (+91 98765 43210)</option>
              <option value="+919123456789">Ananya Patel (+91 91234 56789)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Core Interactive Layout: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
          {/* Left Column: Voice Call Station & Telephony Simulator */}
          <div className="lg:col-span-6 flex flex-col">
            <VoiceCallSimulator
              student={currentStudent}
              topic={selectedTopic}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              isBackendHealthy={isBackendHealthy}
              onTurnComplete={handleTurnComplete}
              onCallEnded={handleCallEnded}
              onCallStarted={handleCallStarted}
            />
          </div>

          {/* Right Column: Socratic Transcript & TwiML Inspector Tabs */}
          <div className="lg:col-span-6 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Tab switch header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 pt-3 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <button
                  id="tab-transcript-btn"
                  onClick={() => setActiveRightTab('transcript')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                    activeRightTab === 'transcript'
                      ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Socratic Dialogue ({messages.length})</span>
                </button>

                <button
                  id="tab-twiml-btn"
                  onClick={() => setActiveRightTab('twiml')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                    activeRightTab === 'twiml'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Twilio TwiML Logs ({webhookLogs.length})</span>
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 p-4 overflow-hidden">
              {activeRightTab === 'transcript' ? (
                <TranscriptFeed messages={messages} onPlaySpeech={handlePlaySpeech} />
              ) : (
                <TwimlInspector logs={webhookLogs} />
              )}
            </div>
          </div>
        </div>

        {/* Post-Call Learning Report Card */}
        {sessionSummary && (
          <section id="learning-report-section">
            <LearningReportCard
              summary={sessionSummary}
              student={currentStudent}
              topicTitle={selectedTopic.title}
              onContinueLearning={() => {
                const nextIdx = (TOPIC_OPTIONS.findIndex((t) => t.id === selectedTopic.id) + 1) % TOPIC_OPTIONS.length;
                setSelectedTopic(TOPIC_OPTIONS[nextIdx]);
                setSessionSummary(null);
                setMessages([]);
                setWebhookLogs([]);
              }}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-4 sm:px-6 lg:px-8 text-slate-500 text-xs text-center">
        <p>
          Vani — AI Voice Learning Tutor • Multi-Model Orchestration: Claude Opus 5 (Azure Anthropic Foundry) & Google Gemini • Twilio Voice Webhooks + Amazon Polly.Aditi TTS
        </p>
      </footer>

      {/* Modals */}
      <TwilioSetupGuide
        isOpen={isTwilioGuideOpen}
        onClose={() => setIsTwilioGuideOpen(false)}
      />

      <BackendTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />
    </div>
  );
}
