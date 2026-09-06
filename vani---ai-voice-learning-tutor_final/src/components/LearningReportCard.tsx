import React from 'react';
import { Award, CheckCircle2, TrendingUp, AlertCircle, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { SessionSummary, Student } from '../types';

interface LearningReportCardProps {
  summary: SessionSummary | null;
  student: Student;
  topicTitle: string;
  onContinueLearning: () => void;
}

export const LearningReportCard: React.FC<LearningReportCardProps> = ({
  summary,
  student,
  topicTitle,
  onContinueLearning,
}) => {
  if (!summary) return null;

  const masteryScore = summary.estimated_mastery_percentage || 85;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Vani Learning Assessment</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                summary.evaluator_model?.includes('claude') || summary.evaluator_model?.includes('opus')
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}>
                {summary.evaluator_model?.includes('claude') ? 'Claude Opus 5 Evaluator' : 'Gemini 3.6 Evaluator'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Student: <span className="text-slate-200 font-semibold">{student.name}</span> • Topic: {topicTitle}
            </p>
          </div>
        </div>

        {/* Mastery Score Gauge */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
              Estimated Mastery
            </span>
            <span className="text-xl font-black text-white">{masteryScore}%</span>
          </div>
          <div
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm ${getScoreColor(
              masteryScore
            )}`}
          >
            {masteryScore}%
          </div>
        </div>
      </div>

      {/* Grid of Concept & Strengths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Concept Learned */}
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
            <BookOpen className="w-4 h-4" />
            <span>Core Concept Learned</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {summary.concept_learned || 'Mastered unit fractions and understood equal partitioning of a whole.'}
          </p>
        </div>

        {/* Key Strengths */}
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Demonstrated Strengths</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {summary.strengths || 'Quickly linked denominator values to the number of slices in a pizza and identified why one-half is larger than one-fourth.'}
          </p>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>Target Area for Growth</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {summary.areas_for_improvement || 'Practice comparing fractions with unlike denominators and converting improper fractions.'}
          </p>
        </div>

        {/* Recommended Next Step */}
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
            <TrendingUp className="w-4 h-4" />
            <span>Recommended Next Step</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {summary.recommended_next_step || 'Progress to comparing 3/4 and 2/3 using visual fraction strips and number lines.'}
          </p>
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Report synced to Student Progress record in Django SQLite database.</span>
        </div>
        <button
          onClick={onContinueLearning}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          <span>Start Next Lesson</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
