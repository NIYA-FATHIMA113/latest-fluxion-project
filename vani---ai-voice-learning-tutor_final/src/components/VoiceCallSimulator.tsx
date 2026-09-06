import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Send,
  Sparkles,
  Radio,
  Clock,
  User,
  HelpCircle,
} from 'lucide-react';
import { VoiceWaveform } from './VoiceWaveform';
import { Student, TopicOption, WebhookLog } from '../types';

interface VoiceCallSimulatorProps {
  student: Student;
  topic: TopicOption;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  isBackendHealthy: boolean;
  onTurnComplete: (
    userSpeech: string,
    tutorReply: string,
    twimlXml: string,
    webhookLog: WebhookLog,
    modelUsed?: string
  ) => void;
  onCallEnded: (sessionId: string) => void;
  onCallStarted: (sessionId: string) => void;
}

export const VoiceCallSimulator: React.FC<VoiceCallSimulatorProps> = ({
  student,
  topic,
  selectedModel,
  onSelectModel,
  isBackendHealthy,
  onTurnComplete,
  onCallEnded,
  onCallStarted,
}) => {
  const [callState, setCallState] = useState<'idle' | 'dialing' | 'connected' | 'speaking' | 'listening' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');
  const [currentTurn, setCurrentTurn] = useState(0);
  const [studentInput, setStudentInput] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [currentTutorSpeech, setCurrentTutorSpeech] = useState<string>('');
  const [activeTutorModel, setActiveTutorModel] = useState<string>(selectedModel);
  const [isLoadingTurn, setIsLoadingTurn] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Call timer effect
  useEffect(() => {
    let timer: any;
    if (callState === 'connected' || callState === 'speaking' || callState === 'listening') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Browser Speech Synthesis (Speak Vani's voice)
  const speakVani = (text: string) => {
    if (!isSoundEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Friendly tutoring pace
    utterance.pitch = 1.05; // Friendly warm pitch

    // Try to pick an Indian English or female voice if available
    const voices = window.speechSynthesis.getVoices();
    const aditiVoice = voices.find(
      (v) => v.lang.includes('en-IN') || v.name.includes('India') || v.name.includes('Aditi') || v.name.includes('Female')
    );
    if (aditiVoice) {
      utterance.voice = aditiVoice;
    }

    utterance.onstart = () => {
      setCallState('speaking');
    };

    utterance.onend = () => {
      setCallState('listening');
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setStudentInput(transcript);
      };

      recognition.onend = () => {
        setIsMicActive(false);
      };

      recognition.onerror = () => {
        setIsMicActive(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. You can type your response!');
      return;
    }

    if (isMicActive) {
      recognitionRef.current.stop();
      setIsMicActive(false);
    } else {
      setStudentInput('');
      recognitionRef.current.start();
      setIsMicActive(true);
    }
  };

  // Start Call Handler (Invokes /api/telephony/voice/incoming/)
  const startCall = async () => {
    setCallState('dialing');
    const newCallSid = 'CA' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const tempSessionId = 'sess_' + Date.now();
    setSessionId(tempSessionId);
    setCurrentTurn(1);
    setActiveTutorModel(selectedModel);
    onCallStarted(tempSessionId);

    try {
      // Send URL-encoded parameters matching Twilio Voice incoming call webhook
      const params = new URLSearchParams({
        CallSid: newCallSid,
        From: student.phone_number,
        To: '+18005550199',
        CallerName: student.name,
        model: selectedModel,
        topic: topic.title,
      });

      const response = await fetch('/api/telephony/voice/incoming/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const twiml = await response.text();

      // Extract spoken text from TwiML XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(twiml, 'text/xml');
      const sayTag = xmlDoc.querySelector('Say');
      const spokenText = sayTag?.textContent || topic.initialQuestion;

      // Extract real Django database session_id from action URL if present
      const gatherTag = xmlDoc.querySelector('Gather');
      const actionUrl = gatherTag?.getAttribute('action') || '';
      let activeSessId = tempSessionId;
      const match = actionUrl.match(/session_id=([0-9a-zA-Z_-]+)/);
      if (match && match[1]) {
        activeSessId = match[1];
        setSessionId(activeSessId);
      }

      setCurrentTutorSpeech(spokenText);
      setCallState('speaking');

      const webhookLog: WebhookLog = {
        id: 'wh_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        endpoint: '/api/telephony/voice/incoming/',
        method: 'POST',
        requestParams: Object.fromEntries(params.entries()),
        twiml,
        status: response.status,
      };

      onTurnComplete('', spokenText, twiml, webhookLog, selectedModel);
      speakVani(spokenText);
    } catch (err) {
      console.warn('Backend proxy fetch failed, using built-in interactive simulator:', err);
      // Fallback in case backend is initializing
      const fallbackSpeech = topic.initialQuestion;
      const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Gather input="speech" action="/api/telephony/voice/interact/?session_id=${tempSessionId}&amp;turn=1" language="en-IN" speechTimeout="auto">\n    <Say voice="Polly.Aditi" language="en-IN">${fallbackSpeech}</Say>\n  </Gather>\n</Response>`;

      setCurrentTutorSpeech(fallbackSpeech);
      setCallState('speaking');

      const webhookLog: WebhookLog = {
        id: 'wh_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        endpoint: '/api/telephony/voice/incoming/',
        method: 'POST',
        requestParams: { CallSid: newCallSid, From: student.phone_number, model: selectedModel },
        twiml: fallbackTwiml,
        status: 200,
      };

      onTurnComplete('', fallbackSpeech, fallbackTwiml, webhookLog, selectedModel);
      speakVani(fallbackSpeech);
    }
  };

  // Submit Student Turn (Invokes /api/telephony/voice/interact/)
  const handleSendSpeech = async (speechText?: string) => {
    const textToSend = speechText || studentInput;
    if (!textToSend.trim() || isLoadingTurn) return;

    if (recognitionRef.current && isMicActive) {
      recognitionRef.current.stop();
      setIsMicActive(false);
    }

    setIsLoadingTurn(true);
    setStudentInput('');
    setCallState('connected');

    const nextTurn = currentTurn + 1;
    setCurrentTurn(nextTurn);

    try {
      const params = new URLSearchParams({
        SpeechResult: textToSend,
        Confidence: '0.94',
        CallSid: 'CA_ACTIVE_CALL',
        From: student.phone_number,
        model: selectedModel,
        session_id: sessionId,
      });

      const response = await fetch(
        `/api/telephony/voice/interact/?session_id=${sessionId}&model=${selectedModel}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }
      );

      const twiml = await response.text();

      // Parse TwiML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(twiml, 'text/xml');
      const sayTag = xmlDoc.querySelector('Say');
      const spokenText = sayTag?.textContent || 'That is a great thought! Can you explain what that means in your own words?';

      const isGoodbye = xmlDoc.querySelector('Hangup') !== null || spokenText.toLowerCase().includes('goodbye') || spokenText.toLowerCase().includes('bye');

      setCurrentTutorSpeech(spokenText);

      const webhookLog: WebhookLog = {
        id: 'wh_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        endpoint: `/api/telephony/voice/interact/?session_id=${sessionId}&turn=${currentTurn}`,
        method: 'POST',
        requestParams: Object.fromEntries(params.entries()),
        twiml,
        status: response.status,
      };

      onTurnComplete(textToSend, spokenText, twiml, webhookLog, selectedModel);
      speakVani(spokenText);

      if (isGoodbye) {
        setTimeout(() => {
          endCall();
        }, 5000);
      }
    } catch (err) {
      console.error('Error in voice interaction:', err);
      // Fallback Socratic turn generator
      const fallbackReply = `Wonderful effort, ${student.name}! You said "${textToSend}". Let's take that one step further: how does this relate to the equal parts of a whole?`;
      const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Gather input="speech" action="/api/telephony/voice/interact/?session_id=${sessionId}&amp;turn=${nextTurn}" language="en-IN">\n    <Say voice="Polly.Aditi" language="en-IN">${fallbackReply}</Say>\n  </Gather>\n</Response>`;

      setCurrentTutorSpeech(fallbackReply);

      const webhookLog: WebhookLog = {
        id: 'wh_' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        endpoint: `/api/telephony/voice/interact/?session_id=${sessionId}&turn=${currentTurn}`,
        method: 'POST',
        requestParams: { SpeechResult: textToSend, From: student.phone_number, model: selectedModel },
        twiml: fallbackTwiml,
        status: 200,
      };

      onTurnComplete(textToSend, fallbackReply, fallbackTwiml, webhookLog, selectedModel);
      speakVani(fallbackReply);
    } finally {
      setIsLoadingTurn(false);
    }
  };

  // End Call Handler
  const endCall = async () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCallState('ended');

    try {
      await fetch(`/api/telephony/voice/goodbye/?session_id=${sessionId}&model=${selectedModel}`, {
        method: 'POST',
      });
    } catch {
      // Ignored if offline
    }

    onCallEnded(sessionId);
  };

  const isCallActive =
    callState === 'connected' || callState === 'speaking' || callState === 'listening';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full">
      {/* Top Bar: Caller Details & Status */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isCallActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Radio
                className={`w-6 h-6 ${isCallActive ? 'animate-pulse text-emerald-400' : ''}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Vani Voice Station</h2>
                {isCallActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Call
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {topic.title} • {topic.grade}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            {isCallActive ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-mono font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(callDuration)}</span>
              </div>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 font-mono">
                Standby
              </span>
            )}

            {/* Audio Toggle */}
            <button
              id="sound-toggle-btn"
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className={`p-2 rounded-lg border transition cursor-pointer ${
                isSoundEnabled
                  ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-750'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
              title={isSoundEnabled ? 'Vani Voice Audio On' : 'Vani Voice Audio Muted'}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Model Selector Bar */}
        <div className="mb-3 px-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Voice Tutor Intelligence:</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Active: {selectedModel === 'claude-opus-5' ? 'Claude Opus 5' : selectedModel === 'gemini-3.6-flash' ? 'Gemini 3.6 Flash' : 'Hybrid AI'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/90 rounded-xl border border-slate-800">
            <button
              id="select-model-claude"
              type="button"
              disabled={isCallActive}
              onClick={() => onSelectModel('claude-opus-5')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-center cursor-pointer disabled:cursor-not-allowed ${
                selectedModel === 'claude-opus-5'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300"></span>
                <span>Claude Opus 5</span>
              </div>
              <span className="text-[9px] opacity-75 font-normal block leading-tight">Azure Anthropic</span>
            </button>

            <button
              id="select-model-gemini"
              type="button"
              disabled={isCallActive}
              onClick={() => onSelectModel('gemini-3.6-flash')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-center cursor-pointer disabled:cursor-not-allowed ${
                selectedModel === 'gemini-3.6-flash'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300"></span>
                <span>Gemini 3.6 Flash</span>
              </div>
              <span className="text-[9px] opacity-75 font-normal block leading-tight">Google GenAI</span>
            </button>

            <button
              id="select-model-hybrid"
              type="button"
              disabled={isCallActive}
              onClick={() => onSelectModel('hybrid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-center cursor-pointer disabled:cursor-not-allowed ${
                selectedModel === 'hybrid'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                <span>Multi-Model</span>
              </div>
              <span className="text-[9px] opacity-75 font-normal block leading-tight">Claude + Gemini</span>
            </button>
          </div>
        </div>

        {/* Dynamic Center Visualizer Area */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-5 text-center my-2 relative overflow-hidden">
          {isCallActive ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    callState === 'speaking'
                      ? 'bg-amber-400 animate-ping'
                      : callState === 'listening'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-indigo-400'
                  }`}
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {callState === 'speaking'
                    ? 'Vani Speaking (Polly.Aditi)'
                    : callState === 'listening'
                    ? 'Listening for Student Voice...'
                    : 'Interactive Dialog'}
                </span>
              </div>

              {/* Dynamic Waveform Visualizer */}
              <VoiceWaveform
                isSpeaking={callState === 'speaking'}
                isListening={callState === 'listening' || isMicActive}
                colorScheme={callState === 'speaking' ? 'amber' : 'emerald'}
              />

              {/* Live Spoken Prompt Card */}
              {currentTutorSpeech && (
                <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-xs text-slate-200 text-left max-h-24 overflow-y-auto">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Current Question:</span>
                  </div>
                  <p className="leading-relaxed italic">"{currentTutorSpeech}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                <Phone className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Call Vani to Begin Tutoring</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Start an interactive telephone learning session. Vani guides using Socratic questions to build intuitive mathematical concepts.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Utterance Chips (Interactive Pre-filled student responses) */}
        {isCallActive && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Quick Student Speech Responses:
              </span>
              <span className="text-[11px] text-slate-500">Tap to simulate voice</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {topic.starterUtterances.map((utt, i) => (
                <button
                  key={i}
                  id={`utterance-chip-${i}`}
                  disabled={isLoadingTurn}
                  onClick={() => handleSendSpeech(utt)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition text-left cursor-pointer disabled:opacity-50"
                >
                  "{utt}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Area */}
      <div className="pt-4 border-t border-slate-800 mt-4">
        {isCallActive ? (
          <div className="space-y-3">
            {/* Input bar: Mic + Text + Send */}
            <div className="flex items-center gap-2">
              <button
                id="mic-speech-btn"
                onClick={toggleMic}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                  isMicActive
                    ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
                title={isMicActive ? 'Stop Listening' : 'Speak with Microphone'}
              >
                {isMicActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <div className="flex-1 relative">
                <input
                  id="student-speech-input"
                  type="text"
                  value={studentInput}
                  onChange={(e) => setStudentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendSpeech();
                  }}
                  placeholder={
                    isMicActive
                      ? 'Listening to your voice...'
                      : 'Type student answer or use microphone...'
                  }
                  disabled={isLoadingTurn}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <button
                id="send-speech-btn"
                onClick={() => handleSendSpeech()}
                disabled={isLoadingTurn || !studentInput.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoadingTurn ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Speak</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Hang Up Bar */}
            <div className="flex items-center justify-between pt-1">
              <button
                id="repeat-question-btn"
                onClick={() => currentTutorSpeech && speakVani(currentTutorSpeech)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Repeat Question</span>
              </button>

              <button
                id="hangup-call-btn"
                onClick={endCall}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Hang Up</span>
              </button>
            </div>
          </div>
        ) : (
          /* Dial Call Button */
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              <span className="text-slate-200 font-medium">{student.name}</span>
              <p className="text-[11px] text-slate-500">{student.phone_number}</p>
            </div>

            <button
              id="start-call-btn"
              onClick={startCall}
              className="flex items-center gap-2.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Call Vani Tutor</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
