'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Flame, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Streak } from '@/types';

interface StreakDisplayProps {
  streak: Streak;
  className?: string;
}

export function StreakDisplay({ streak, className }: StreakDisplayProps) {
  const t = useTranslations('education.gamification.streakDisplay');
  const today = new Date();
  const lastStudy = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;
  const isStudiedToday = lastStudy && lastStudy.toDateString() === today.toDateString();

  // Generate last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  // Check if a day was studied (simplified - in real app, would check against actual study history)
  const wasStudied = (date: Date): boolean => {
    if (!lastStudy) return false;
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff < streak.current;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                streak.current > 0
                  ? 'bg-gradient-to-br from-orange-400 to-red-500'
                  : 'bg-slate-200 dark:bg-slate-700',
              )}
              animate={
                streak.current > 0
                  ? {
                      scale: [1, 1.05, 1],
                    }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame
                className={cn('w-6 h-6', streak.current > 0 ? 'text-white' : 'text-slate-400')}
              />
            </motion.div>
            <div>
              <p className="text-3xl font-bold">{streak.current}</p>
              <p className="text-sm text-slate-500">{t('consecutiveDays')}</p>
            </div>
          </div>

          {/* Longest streak badge */}
          {streak.longest > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-500">
                <Award className="w-4 h-4" />
                <span className="text-sm font-medium">{streak.longest}</span>
              </div>
              <p className="text-xs text-slate-500">{t('record')}</p>
            </div>
          )}
        </div>

        {/* Week visualization */}
        <div className="grid grid-cols-7 gap-2">
          {last7Days.map((date, index) => {
            const isToday = date.toDateString() === today.toDateString();
            const studied = wasStudied(date) || (isToday && isStudiedToday);
            const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });

            return (
              <div key={index} className="text-center">
                <p className="text-xs text-slate-500 mb-1">{dayName}</p>
                <motion.div
                  className={cn(
                    'w-10 h-10 mx-auto rounded-xl flex items-center justify-center',
                    studied
                      ? 'bg-gradient-to-br from-orange-400 to-red-500'
                      : isToday
                        ? 'bg-slate-200 dark:bg-slate-700 ring-2 ring-blue-500'
                        : 'bg-slate-100 dark:bg-slate-800',
                  )}
                  initial={studied ? { scale: 0 } : {}}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {studied ? (
                    <Flame className="w-5 h-5 text-white" />
                  ) : (
                    <span className="text-xs text-slate-400">{date.getDate()}</span>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Motivation message */}
        <div className="mt-6 text-center">
          {!isStudiedToday ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="text-orange-500 font-medium">{t('studyToday')}</span>{' '}
              {t('studyTodayToMaintain')}
            </p>
          ) : streak.current >= 7 ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              {t('weekOfStudy')}
            </p>
          ) : (
            <p className="text-sm text-green-600 dark:text-green-400">{t('greatJobToday')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
