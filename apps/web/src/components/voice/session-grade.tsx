'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GradeDisplay } from './components/grade-display';
import { useProgressStore, type SessionGrade } from '@/lib/stores';
import { clientLogger as logger } from '@/lib/logger/client';
import {
  generateFeedback,
  generateStrengths,
  generateAreasToImprove,
} from './helpers/grade-helpers';
import type { Maestro } from '@/types';
import { useTranslations } from 'next-intl';

interface SessionGradeProps {
  maestro: Maestro;
  sessionDuration: number; // in minutes
  questionsAsked: number;
  xpEarned: number;
  onClose: () => void;
  onRequestGrade?: () => Promise<SessionGrade>;
}

export function SessionGradeDisplay({
  maestro,
  sessionDuration,
  questionsAsked,
  xpEarned,
  onClose,
  onRequestGrade,
}: SessionGradeProps) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [grade, setGrade] = useState<SessionGrade | null>(null);
  const { gradeCurrentSession } = useProgressStore();
  const t = useTranslations('voice');

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
          // Generate automatic grade based on metrics (deterministic)
          const baseScore = Math.min(
            10,
            Math.max(
              1,
              5 + // Base score
                Math.min(2, questionsAsked * 0.5) + // Questions bonus
                Math.min(2, sessionDuration * 0.1) + // Duration bonus
                Math.min(0.5, (questionsAsked + sessionDuration) * 0.02), // Engagement bonus
            ),
          );

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
          feedback: t('sessionGrade.goodSession'),
          strengths: [t('sessionGrade.commitment')],
          areasToImprove: [t('sessionGrade.keepGoing')],
        });
      } finally {
        setIsGenerating(false);
      }
    };

    generateGrade();
  }, [onRequestGrade, questionsAsked, sessionDuration, gradeCurrentSession, t]);

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
                    alt={maestro.displayName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{t('sessionGrade.title')}</h2>
                  <p className="text-sm text-slate-400">
                    {t('sessionGrade.by')} {maestro.displayName}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-400 hover:text-white hover:bg-slate-700"
                aria-label={t('sessionGrade.closeAriaLabel')}
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
                <p className="text-slate-400">{t('sessionGrade.evaluating')}</p>
              </div>
            ) : (
              grade && (
                <GradeDisplay
                  grade={grade}
                  sessionDuration={sessionDuration}
                  questionsAsked={questionsAsked}
                  xpEarned={xpEarned}
                />
              )
            )}
          </div>

          {/* Footer */}
          <div className="p-6 pt-0">
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              disabled={isGenerating}
            >
              {t('sessionGrade.close')}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
