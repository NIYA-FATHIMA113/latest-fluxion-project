import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, Code2 } from 'lucide-react';
import { WebhookLog } from '../types';

interface TwimlInspectorProps {
  logs: WebhookLog[];
}

export const TwimlInspector: React.FC<TwimlInspectorProps> = ({ logs }) => {
  const [selectedLogIndex, setSelectedLogIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeLog = logs[selectedLogIndex] || logs[0];

  const handleCopy = () => {
    if (!activeLog) return;
    navigator.clipboard.writeText(activeLog.twiml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Twilio Telephony & TwiML Inspector</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Polly.Aditi en-IN
          </span>
          {activeLog && (
            <button
              id="copy-twiml-btn"
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied XML' : 'Copy TwiML'}</span>
            </button>
          )}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <Code2 className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-xs font-medium text-slate-300">No Webhook Logs Yet</p>
          <p className="text-[11px] text-slate-500 max-w-xs mt-1">
            Initiate a call in the simulator to inspect live Twilio HTTP POST payloads and generated TwiML XML responses.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Turn selector tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 border-b border-slate-800/60 text-xs">
            {logs.map((log, idx) => (
              <button
                key={log.id}
                onClick={() => setSelectedLogIndex(idx)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition whitespace-nowrap cursor-pointer ${
                  selectedLogIndex === idx
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Turn #{idx + 1} ({log.timestamp})
              </button>
            ))}
          </div>

          {activeLog && (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Webhook Meta Bar */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                      {activeLog.method}
                    </span>
                    <span className="font-mono text-slate-300 text-xs truncate max-w-[280px]">
                      {activeLog.endpoint}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                    HTTP {activeLog.status} OK
                  </span>
                </div>

                {/* Request params preview */}
                <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                  {Object.entries(activeLog.requestParams).map(([key, val]) => (
                    <span key={key} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      <span className="text-slate-500">{key}:</span> <span className="text-slate-200">"{val}"</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* TwiML Code Window */}
              <div className="flex-1 min-h-[140px] bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-[11px] overflow-auto text-emerald-400 leading-relaxed select-all">
                <pre>{activeLog.twiml}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
