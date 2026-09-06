import React from 'react';

interface VoiceWaveformProps {
  isSpeaking: boolean;
  isListening: boolean;
  colorScheme?: 'indigo' | 'emerald' | 'amber';
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isSpeaking,
  isListening,
  colorScheme = 'indigo',
}) => {
  const bars = [16, 28, 44, 20, 36, 52, 28, 48, 24, 38, 56, 32, 20, 42, 26, 18];

  const getColorClass = () => {
    if (colorScheme === 'emerald') return 'bg-emerald-400';
    if (colorScheme === 'amber') return 'bg-amber-400';
    return 'bg-indigo-400';
  };

  const isActive = isSpeaking || isListening;

  return (
    <div className="flex items-center justify-center gap-1 h-16 px-4 py-2">
      {bars.map((height, i) => {
        const animationDelay = `${(i * 0.08).toFixed(2)}s`;
        const activeHeight = isActive ? `${Math.max(12, (height * (isSpeaking ? 1 : 0.75))).toFixed(0)}px` : '4px';

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ${getColorClass()} ${
              isActive ? 'animate-pulse' : 'opacity-40'
            }`}
            style={{
              height: activeHeight,
              animationDelay,
              animationDuration: isSpeaking ? '0.6s' : '1.2s',
            }}
          />
        );
      })}
    </div>
  );
};
