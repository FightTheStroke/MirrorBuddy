'use client';

import { motion } from 'framer-motion';
import { Star, TrendingUp, Clock, MessageSquare, Trophy, BookOpen, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionEvaluation } from '@/types';

interface EvaluationCardProps {
  evaluation: SessionEvaluation;
  maestroName: string;
  maestroColor: string;
  className?: string;
}

const GRADE_LABELS: Record<number, { label: string; emoji: string; colorClass: string }> = {
  10: { label: 'Eccezionale', emoji: '🏆', colorClass: 'from-yellow-400 to-amber-500' },
  9: { label: 'Eccellente', emoji: '🌟', colorClass: 'from-amber-400 to-orange-500' },
  8: { label: 'Ottimo', emoji: '✨', colorClass: 'from-green-400 to-emerald-500' },
  7: { label: 'Buono', emoji: '👍', colorClass: 'from-teal-400 to-cyan-500' },
  6: { label: 'Sufficiente', emoji: '📚', colorClass: 'from-blue-400 to-indigo-500' },
  5: { label: 'Da Migliorare', emoji: '💪', colorClass: 'from-purple-400 to-violet-500' },
  4: { label: 'Insufficiente', emoji: '📖', colorClass: 'from-orange-400 to-red-500' },
  3: { label: 'Scarso', emoji: '⚠️', colorClass: 'from-red-400 to-rose-500' },
  2: { label: 'Molto Scarso', emoji: '❌', colorClass: 'from-red-500 to-red-700' },
  1: { label: 'Inaccettabile', emoji: '💀', colorClass: 'from-slate-500 to-slate-700' },
};

/**
 * Inline evaluation card that appears in the chat flow.
 * Shows session grade, stats, strengths, and areas to improve.
 */
export function EvaluationCard({
  evaluation,
  maestroName,
  maestroColor,
  className,
}: EvaluationCardProps) {
  // Clamp score to valid range 1-10
  const clampedScore = Math.min(10, Math.max(1, evaluation.score));
  const gradeInfo = GRADE_LABELS[clampedScore] || GRADE_LABELS[5];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'rounded-2xl overflow-hidden border shadow-lg',
        'bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950',
        'border-slate-200 dark:border-slate-700',
        className
      )}
    >
      {/* Header with grade */}
      <div
        className="px-5 py-4 text-white"
        style={{ background: `linear-gradient(135deg, ${maestroColor}, ${maestroColor}dd)` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Valutazione Sessione</h3>
            <p className="text-sm opacity-90">da {maestroName}</p>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={cn(
              'w-16 h-16 rounded-full flex flex-col items-center justify-center bg-gradient-to-br',
              gradeInfo.colorClass
            )}
          >
            <span className="text-2xl font-bold">{clampedScore}</span>
            <span className="text-xs opacity-80">/10</span>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-2 flex items-center gap-2"
        >
          <span className="text-xl">{gradeInfo.emoji}</span>
          <span className="font-medium">{gradeInfo.label}</span>
        </motion.div>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-3 gap-2 p-4 border-b border-slate-200 dark:border-slate-700"
      >
        <div className="text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-blue-500" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {evaluation.sessionDuration}min
          </p>
          <p className="text-xs text-slate-500">Durata</p>
        </div>
        <div className="text-center">
          <MessageSquare className="w-4 h-4 mx-auto mb-1 text-green-500" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {evaluation.questionsAsked}
          </p>
          <p className="text-xs text-slate-500">Domande</p>
        </div>
        <div className="text-center">
          <Trophy className="w-4 h-4 mx-auto mb-1 text-amber-500" />
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            +{evaluation.xpEarned}
          </p>
          <p className="text-xs text-slate-500">XP</p>
        </div>
      </motion.div>

      {/* Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-4 space-y-3"
      >
        {/* Quote */}
        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 italic">
            &ldquo;{evaluation.feedback}&rdquo;
          </p>
        </div>

        {/* Strengths */}
        {evaluation.strengths.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-green-600 dark:text-green-400" />
              <h4 className="text-sm font-medium text-green-700 dark:text-green-400">
                Punti di forza
              </h4>
            </div>
            <ul className="space-y-1">
              {evaluation.strengths.map((strength, i) => (
                <li
                  key={i}
                  className="text-sm text-green-600 dark:text-green-300 flex items-start gap-2"
                >
                  <span className="text-green-500">+</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas to improve */}
        {evaluation.areasToImprove.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Da migliorare
              </h4>
            </div>
            <ul className="space-y-1">
              {evaluation.areasToImprove.map((area, i) => (
                <li
                  key={i}
                  className="text-sm text-amber-600 dark:text-amber-300 flex items-start gap-2"
                >
                  <span className="text-amber-500">→</span>
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Saved to diary indicator */}
        {evaluation.savedToDiary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Salvato nel diario per i genitori</span>
            <BookOpen className="w-4 h-4 ml-auto text-slate-400" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
