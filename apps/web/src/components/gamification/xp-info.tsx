'use client';

import { Brain, MessageCircle, Clock, CreditCard, Target, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { POMODORO_XP, MAESTRI_XP, FLASHCARD_XP } from '@/lib/constants/xp-rewards';

interface XPInfoProps {
  className?: string;
}

/**
 * XPInfo - Component that explains how to earn XP in MirrorBuddy
 *
 * Displays clear, visual breakdown of all XP earning opportunities
 */
export function XPInfo({ className }: XPInfoProps) {
  const t = useTranslations('education.gamification.xpInfo');
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('title')}</h3>
      </div>

      <div className="space-y-3">
        {/* Maestri Sessions */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
          <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
              {t('maestriTitle')}
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-0.5">
              <li>
                • {MAESTRI_XP.PER_MINUTE} {t('maestriPerMinute')}
              </li>
              <li>
                • {MAESTRI_XP.PER_QUESTION} {t('maestriPerQuestion')}
              </li>
              <li>• {t('maestriMaxPerSession', { max: MAESTRI_XP.MAX_PER_SESSION })}</li>
            </ul>
          </div>
        </div>

        {/* Flashcards */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900">
          <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
              {t('flashcardsTitle')}
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-0.5">
              <li>
                • {FLASHCARD_XP.AGAIN} {t('flashcardAgain')}
              </li>
              <li>
                • {FLASHCARD_XP.HARD} {t('flashcardHard')}
              </li>
              <li>
                • {FLASHCARD_XP.GOOD} {t('flashcardGood')}
              </li>
              <li>
                • {FLASHCARD_XP.EASY} {t('flashcardEasy')}
              </li>
              <li>• {t('flashcardBonusDecks')}</li>
            </ul>
          </div>
        </div>

        {/* Pomodoro */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900">
          <Clock className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
              {t('pomodoroTitle')}
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-0.5">
              <li>
                • {POMODORO_XP.SINGLE} {t('pomodoroSingle')}
              </li>
              <li>
                • +{POMODORO_XP.FIRST_OF_DAY} {t('pomodoroFirst')}
              </li>
              <li>
                • +{POMODORO_XP.CYCLE_BONUS} {t('pomodoroCycleBonus')}
              </li>
            </ul>
          </div>
        </div>

        {/* Quizzes */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900">
          <Target className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
              {t('quizTitle')}
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-0.5">
              <li>• {t('quizScoreBased')}</li>
              <li>• {t('quizMasteryBonus')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900">
        <div className="flex items-start gap-2">
          <MessageCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>{t('tipLabel')}</strong> {t('tipMessage')}
          </p>
        </div>
      </div>
    </div>
  );
}
