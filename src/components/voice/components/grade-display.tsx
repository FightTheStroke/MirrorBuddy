'use client';

import { motion } from 'framer-motion';
import { Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionGrade } from '@/lib/stores';

export const GRADE_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  10: { label: 'Eccezionale', emoji: '🏆', color: 'from-yellow-400 to-amber-500' },
  9: { label: 'Eccellente', emoji: '🌟', color: 'from-amber-400 to-orange-500' },
  8: { label: 'Ottimo', emoji: '✨', color: 'from-green-400 to-emerald-500' },
  7: { label: 'Buono', emoji: '👍', color: 'from-teal-400 to-cyan-500' },
  6: { label: 'Sufficiente', emoji: '📚', color: 'from-blue-400 to-indigo-500' },
  5: { label: 'Da Migliorare', emoji: '💪', color: 'from-purple-400 to-violet-500' },
  4: { label: 'Insufficiente', emoji: '📖', color: 'from-orange-400 to-red-500' },
  3: { label: 'Scarso', emoji: '⚠️', color: 'from-red-400 to-rose-500' },
  2: { label: 'Molto Scarso', emoji: '❌', color: 'from-red-500 to-red-700' },
  1: { label: 'Inaccettabile', emoji: '💀', color: 'from-slate-500 to-slate-700' },
};

interface GradeDisplayProps {
  grade: SessionGrade;
  sessionDuration: number;
  questionsAsked: number;
  xpEarned: number;
}

export function GradeDisplay({
  grade,
  sessionDuration,
  questionsAsked,
  xpEarned,
}: GradeDisplayProps) {
  const gradeInfo = GRADE_LABELS[grade.score] || GRADE_LABELS[5];

  return (
    <>
      {/* Score circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="flex flex-col items-center mb-6"
      >
        <div className={cn(
          'w-32 h-32 rounded-full flex flex-col items-center justify-center bg-gradient-to-br',
          gradeInfo.color
        )}>
          <span className="text-5xl font-bold">{grade.score}</span>
          <span className="text-sm opacity-80">/10</span>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-3 flex items-center gap-2"
        >
          <span className="text-2xl">{gradeInfo.emoji}</span>
          <span className="text-xl font-semibold">{gradeInfo.label}</span>
        </motion.div>
      </motion.div>

      {/* Session stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <div className="w-5 h-5 mx-auto mb-1 text-blue-400">⏱️</div>
          <p className="text-lg font-semibold">{sessionDuration}min</p>
          <p className="text-xs text-slate-400">Durata</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <div className="w-5 h-5 mx-auto mb-1 text-green-400">💬</div>
          <p className="text-lg font-semibold">{questionsAsked}</p>
          <p className="text-xs text-slate-400">Domande</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <div className="w-5 h-5 mx-auto mb-1 text-amber-400">🏆</div>
          <p className="text-lg font-semibold">+{xpEarned}</p>
          <p className="text-xs text-slate-400">XP</p>
        </div>
      </motion.div>

      {/* Feedback section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <div className="bg-slate-800/30 rounded-xl p-4">
          <p className="text-slate-200 italic">&ldquo;{grade.feedback}&rdquo;</p>
        </div>

        {/* Strengths */}
        {grade.strengths.length > 0 && (
          <div className="bg-green-900/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-green-400" />
              <h4 className="font-medium text-green-400">Punti di forza</h4>
            </div>
            <ul className="space-y-1">
              {grade.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-green-300 flex items-start gap-2">
                  <span className="text-green-500">+</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas to improve */}
        {grade.areasToImprove.length > 0 && (
          <div className="bg-amber-900/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h4 className="font-medium text-amber-400">Da migliorare</h4>
            </div>
            <ul className="space-y-1">
              {grade.areasToImprove.map((area, i) => (
                <li key={i} className="text-sm text-amber-300 flex items-start gap-2">
                  <span className="text-amber-500">→</span>
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </>
  );
}
