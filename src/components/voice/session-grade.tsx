'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Star, Trophy, TrendingUp, Clock, MessageSquare, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useProgressStore, type SessionGrade } from '@/lib/stores/app-store';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { Maestro } from '@/types';

interface SessionGradeProps {
  maestro: Maestro;
  sessionDuration: number; // in minutes
  questionsAsked: number;
  xpEarned: number;
  onClose: () => void;
  onRequestGrade?: () => Promise<SessionGrade>;
}

const GRADE_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
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

export function SessionGradeDisplay({ maestro, sessionDuration, questionsAsked, xpEarned, onClose, onRequestGrade }: SessionGradeProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [grade, setGrade] = useState<SessionGrade | null>(null);
  const { gradeCurrentSession } = useProgressStore();

  // Generate grade on mount
  useEffect(() => {
    const generateGrade = async () => {
      setIsGenerating(true);

      try {
        if (onRequestGrade) {
          // Get AI-generated grade
          const aiGrade = await onRequestGrade();
          setGrade(aiGrade);
          gradeCurrentSession(aiGrade);
        } else {
          // Generate automatic grade based on metrics
          const baseScore = Math.min(10, Math.max(1,
            5 + // Base score
            Math.min(2, questionsAsked * 0.5) + // Questions bonus
            Math.min(2, sessionDuration * 0.1) + // Duration bonus
            Math.random() * 1 // Variability
          ));

          const autoGrade: SessionGrade = {
            score: Math.round(baseScore),
            feedback: generateFeedback(baseScore, questionsAsked, sessionDuration),
            strengths: generateStrengths(questionsAsked, sessionDuration),
            areasToImprove: generateAreasToImprove(questionsAsked, sessionDuration),
          };

          setGrade(autoGrade);
          gradeCurrentSession(autoGrade);
        }
      } catch (error) {
        logger.error('Failed to generate grade', { error: String(error) });
        // Fallback grade
        setGrade({
          score: 7,
          feedback: 'Buona sessione di studio!',
          strengths: ['Impegno costante'],
          areasToImprove: ['Continua cosi!'],
        });
      } finally {
        setIsGenerating(false);
      }
    };

    generateGrade();
  }, [onRequestGrade, questionsAsked, sessionDuration, gradeCurrentSession]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const gradeInfo = grade ? GRADE_LABELS[grade.score] || GRADE_LABELS[5] : GRADE_LABELS[5];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md mx-4"
      >
        <Card className="bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700 text-white overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/20"
                  style={{ backgroundColor: maestro.color }}
                >
                  <Image
                    src={maestro.avatar}
                    alt={maestro.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Valutazione Sessione</h2>
                  <p className="text-sm text-slate-400">da {maestro.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-white hover:bg-slate-700"
                aria-label="Chiudi valutazione"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Grade display */}
          <div className="p-6">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-12 h-12 text-amber-400" />
                </motion.div>
                <p className="text-slate-400">Il maestro sta valutando...</p>
              </div>
            ) : grade && (
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
                    <Clock className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                    <p className="text-lg font-semibold">{sessionDuration}min</p>
                    <p className="text-xs text-slate-400">Durata</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <MessageSquare className="w-5 h-5 mx-auto mb-1 text-green-400" />
                    <p className="text-lg font-semibold">{questionsAsked}</p>
                    <p className="text-xs text-slate-400">Domande</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <Trophy className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                    <p className="text-lg font-semibold">+{xpEarned}</p>
                    <p className="text-xs text-slate-400">XP</p>
                  </div>
                </motion.div>

                {/* Feedback */}
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
            )}
          </div>

          {/* Footer */}
          <div className="p-6 pt-0">
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              disabled={isGenerating}
            >
              Chiudi
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

// Helper functions for automatic grade generation
function generateFeedback(score: number, _questions: number, _duration: number): string {
  if (score >= 9) {
    return 'Sessione eccezionale! Hai dimostrato grande impegno e curiosita. Continua cosi!';
  } else if (score >= 7) {
    return 'Ottima sessione di studio. Hai fatto buoni progressi e posto domande interessanti.';
  } else if (score >= 5) {
    return 'Buona sessione. C\'e ancora margine di miglioramento, ma stai andando nella direzione giusta.';
  } else {
    return 'La sessione e stata breve. Prova a dedicare piu tempo allo studio per risultati migliori.';
  }
}

function generateStrengths(questions: number, duration: number): string[] {
  const strengths: string[] = [];

  if (questions >= 5) {
    strengths.push('Curiosita e voglia di approfondire');
  }
  if (duration >= 10) {
    strengths.push('Buona concentrazione durante la sessione');
  }
  if (questions >= 3 && duration >= 5) {
    strengths.push('Interazione attiva con il professore');
  }
  if (strengths.length === 0) {
    strengths.push('Hai iniziato il percorso di apprendimento');
  }

  return strengths;
}

function generateAreasToImprove(questions: number, duration: number): string[] {
  const areas: string[] = [];

  if (questions < 3) {
    areas.push('Fai piu domande per chiarire i dubbi');
  }
  if (duration < 10) {
    areas.push('Prova sessioni piu lunghe per approfondire meglio');
  }
  if (areas.length === 0) {
    areas.push('Continua a esercitarti regolarmente');
  }

  return areas;
}
