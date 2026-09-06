import React, { useRef, useEffect } from 'react';
import { Sparkles, User, Volume2, MessageSquare } from 'lucide-react';
import { SessionMessage } from '../types';

interface TranscriptFeedProps {
  messages: SessionMessage[];
  onPlaySpeech?: (text: string) => void;
}

export const TranscriptFeed: React.FC<TranscriptFeedProps> = ({
  messages,
  onPlaySpeech,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSocraticTag = (text: string, role: string) => {
    if (role === 'student') return null;
    const lower = text.toLowerCase();
    if (lower.includes('goodbye') || lower.includes('bye')) return 'Session Wrap-up';
    if (lower.includes('why') || lower.includes('how') || lower.includes('what')) return 'Guided Question';
    if (lower.includes('pizza') || lower.includes('imagine') || lower.includes('slices')) return 'Real-World Model';
    if (lower.includes('exactly') || lower.includes('great') || lower.includes('wonderful')) return 'Encouragement';
    return 'Socratic Prompt';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white">Live Socratic Transcript</h2>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          {messages.length} utterances
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-slate-300">Transcript will appear here</p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              When you call Vani, real-time speech from both the tutor and student will be transcribed and tagged here.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isTutor = msg.role === 'tutor';
            const socraticTag = getSocraticTag(msg.content, msg.role);

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isTutor ? 'justify-start' : 'justify-end'}`}
              >
                {isTutor && (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl p-3.5 text-xs ${
                    isTutor
                      ? 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-sm'
                      : 'bg-indigo-600 text-white rounded-tr-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-[11px] opacity-90">
                        {isTutor ? 'Vani (AI Tutor)' : 'Student'}
                      </span>
                      {isTutor && msg.model_used && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                          msg.model_used.includes('claude') || msg.model_used.includes('opus')
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {msg.model_used.includes('claude') ? 'Claude Opus 5' : 'Gemini 3.6'}
                        </span>
                      )}
                      {socraticTag && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-medium">
                          {socraticTag}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] opacity-60 font-mono">{msg.timestamp}</span>
                  </div>

                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                  {isTutor && onPlaySpeech && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-end">
                      <button
                        onClick={() => onPlaySpeech(msg.content)}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="Play audio"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>
                    </div>
                  )}
                </div>

                {!isTutor && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
