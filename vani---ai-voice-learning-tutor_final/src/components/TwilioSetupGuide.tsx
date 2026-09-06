import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, PhoneCall, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface TwilioSetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TwilioSetupGuide: React.FC<TwilioSetupGuideProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin = window.location.origin;

  const endpoints = [
    {
      key: 'incoming',
      title: 'Incoming Voice Call Webhook (Primary)',
      description: 'Set this in your Twilio Console Phone Number under "A Call Comes In" -> Webhook',
      method: 'HTTP POST',
      url: `${currentOrigin}/api/telephony/voice/incoming/`,
    },
    {
      key: 'interact',
      title: 'Speech Gather Action Endpoint',
      description: 'Automatically called by Twilio <Gather> after student speaks with speech transcript in SpeechResult',
      method: 'HTTP POST',
      url: `${currentOrigin}/api/telephony/voice/interact/`,
    },
    {
      key: 'goodbye',
      title: 'Call Hangup & Session Finalizer',
      description: 'Triggered when session ends or goodbye intent is detected to finalize Gemini learning summary',
      method: 'HTTP POST',
      url: `${currentOrigin}/api/telephony/voice/goodbye/`,
    },
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Twilio Telephony Configuration</h2>
              <p className="text-xs text-slate-400">
                Connect your real phone number to Vani AI Voice Tutor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Steps */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-3">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            3-Step Twilio Setup:
          </h3>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
            <li>Log in to your <strong>Twilio Console</strong> & navigate to <strong>Phone Numbers &gt; Manage &gt; Active Numbers</strong>.</li>
            <li>Click your phone number and scroll to the <strong>Voice Configuration</strong> section.</li>
            <li>Under <strong>"A Call Comes In"</strong>, select <strong>Webhook</strong>, set method to <strong>HTTP POST</strong>, and paste the Incoming Call URL below.</li>
          </ol>
        </div>

        {/* Endpoints List */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Telephony Webhook Endpoints
          </h3>

          {endpoints.map((ep) => (
            <div
              key={ep.key}
              className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/90 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    {ep.method}
                  </span>
                  <span className="text-xs font-semibold text-white">{ep.title}</span>
                </div>
                <button
                  onClick={() => handleCopy(ep.url, ep.key)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition cursor-pointer"
                >
                  {copiedKey === ep.key ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === ep.key ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">{ep.description}</p>
              <div className="bg-slate-900 px-3 py-2 rounded-lg font-mono text-xs text-indigo-300 break-all select-all border border-slate-800">
                {ep.url}
              </div>
            </div>
          ))}
        </div>

        {/* Voice specs */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
          <h4 className="font-semibold text-slate-200">Audio & Voice Engine Specs</h4>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
            <div>Voice: <span className="text-slate-200">Amazon Polly.Aditi</span></div>
            <div>Language: <span className="text-slate-200">en-IN (Indian English)</span></div>
            <div>Input: <span className="text-slate-200">Speech (Automatic Endpointer)</span></div>
            <div>Dialogue Model: <span className="text-slate-200">Gemini 2.5 Socratic</span></div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
