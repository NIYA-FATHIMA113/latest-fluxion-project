import React from 'react';
import {
  GraduationCap,
  Sparkles,
  PhoneCall,
  Activity,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import { Student } from '../types';

interface NavbarProps {
  currentStudent: Student;
  activeTopic: string;
  isBackendHealthy: boolean;
  selectedModel: string;
  onOpenTwilioGuide: () => void;
  onOpenTestModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStudent,
  isBackendHealthy,
  selectedModel,
  onOpenTwilioGuide,
  onOpenTestModal,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <GraduationCap className="w-5 h-5" />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Vani
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Voice Tutor
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Twilio Telephony & Socratic Dialogue Engine
            </p>
          </div>
        </div>

        {/* Student & Engine Indicators */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Active Student Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span className="text-slate-400">Student:</span>
            <span className="font-semibold text-slate-200">{currentStudent.name}</span>
            <span className="text-slate-500">({currentStudent.phone_number})</span>
          </div>

          {/* Backend Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-800 border-slate-700">
            {isBackendHealthy ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Backend Online</span>
              </>
            ) : (
              <>
                <Activity className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-400">Checking API...</span>
              </>
            )}
          </div>

          {/* Socratic Engine Pill */}
          <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            selectedModel === 'claude-opus-5'
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
              : selectedModel === 'gemini-3.6-flash'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {selectedModel === 'claude-opus-5'
                ? 'Claude Opus 5 (Azure Anthropic)'
                : selectedModel === 'gemini-3.6-flash'
                ? 'Gemini 3.6 Flash (Google GenAI)'
                : 'Claude Opus + Gemini (Hybrid)'}
            </span>
          </div>

          {/* Twilio Webhook Configuration Button */}
          <button
            id="twilio-guide-btn"
            onClick={onOpenTwilioGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Twilio Setup</span>
          </button>

          {/* Tests Button */}
          <button
            id="test-suite-btn"
            onClick={onOpenTestModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            title="Backend Unit Test Suite"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">12 Tests</span>
          </button>
        </div>
      </div>
    </header>
  );
};
