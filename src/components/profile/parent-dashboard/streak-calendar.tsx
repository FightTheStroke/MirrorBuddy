'use client';

import { useMemo } from 'react';
import { Flame, Target, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { StreakInfo } from '@/types';

interface StreakCalendarProps {
  streak: StreakInfo;
  highContrast?: boolean;
  className?: string;
}

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

/**
 * Streak calendar visualization showing activity over the past 30 days.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function StreakCalendar({ streak, highContrast = false, className }: StreakCalendarProps) {
  const t = useTranslations('settings.parentDashboard');
  const activeDaySet = useMemo(() => new Set(streak.activeDays), [streak.activeDays]);

  const calendarDays = useMemo(() => {
    const days: Array<{ date: string; isActive: boolean; isToday: boolean }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        isActive: activeDaySet.has(dateStr),
        isToday: i === 0,
      });
    }
    return days;
  }, [activeDaySet]);

  const goalProgress =
    streak.dailyGoalMinutes > 0
      ? Math.min(100, Math.round((streak.todayMinutes / streak.dailyGoalMinutes) * 100))
      : 0;

  return (
    <section className={cn('space-y-4', className)} aria-label={t('streakActivityAriaLabel')}>
      {/* Streak Stats */}
      <div className="flex items-center justify-between">
        <h2
          className={cn(
            'text-lg font-semibold',
            highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white',
          )}
        >
          {t('streak')}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5" title="Streak attuale">
            <Flame
              className={cn(
                'w-5 h-5',
                streak.currentStreak > 0
                  ? highContrast
                    ? 'text-yellow-400'
                    : 'text-orange-500'
                  : highContrast
                    ? 'text-yellow-200/50'
                    : 'text-slate-400',
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'font-bold',
                highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white',
              )}
            >
              {streak.currentStreak}
            </span>
            <span className={cn('text-sm', highContrast ? 'text-yellow-200' : 'text-slate-500')}>
              {t('streakDays')}
            </span>
          </div>
          <div className="flex items-center gap-1.5" title="Record personale">
            <Trophy
              className={cn('w-5 h-5', highContrast ? 'text-yellow-400' : 'text-amber-500')}
              aria-hidden="true"
            />
            <span
              className={cn(
                'font-bold',
                highContrast ? 'text-yellow-400' : 'text-slate-900 dark:text-white',
              )}
            >
              {streak.longestStreak}
            </span>
            <span className={cn('text-sm', highContrast ? 'text-yellow-200' : 'text-slate-500')}>
              {t('streakRecord')}
            </span>
          </div>
        </div>
      </div>

      {/* Today's Goal Progress */}
      <div
        className={cn(
          'p-3 rounded-lg',
          highContrast ? 'bg-black border border-yellow-400' : 'bg-slate-50 dark:bg-slate-800/50',
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target
              className={cn('w-4 h-4', highContrast ? 'text-yellow-400' : 'text-primary')}
              aria-hidden="true"
            />
            <span
              className={cn(
                'text-sm font-medium',
                highContrast ? 'text-yellow-400' : 'text-slate-700 dark:text-slate-300',
              )}
            >
              {t('streakDailyGoal')}
            </span>
          </div>
          <span
            className={cn(
              'text-sm',
              highContrast ? 'text-yellow-200' : 'text-slate-500 dark:text-slate-400',
            )}
          >
            {streak.todayMinutes}/{streak.dailyGoalMinutes} min
          </span>
        </div>
        <div
          className={cn(
            'h-2 rounded-full overflow-hidden',
            highContrast ? 'bg-yellow-400/20' : 'bg-slate-200 dark:bg-slate-700',
          )}
          role="progressbar"
          aria-valuenow={goalProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso obiettivo: ${goalProgress}%`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              streak.goalMetToday
                ? highContrast
                  ? 'bg-yellow-400'
                  : 'bg-green-500'
                : highContrast
                  ? 'bg-yellow-400'
                  : 'bg-primary',
            )}
            style={{ width: `${goalProgress}%` }}
          />
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        className={cn(
          'p-4 rounded-xl border',
          highContrast
            ? 'bg-black border-yellow-400'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        )}
      >
        <p
          className={cn(
            'text-xs mb-3',
            highContrast ? 'text-yellow-200' : 'text-slate-500 dark:text-slate-400',
          )}
        >
          {t('streakLast30Days')}
        </p>
        <div
          className="grid grid-cols-7 gap-1.5"
          role="grid"
          aria-label={t('calendarActivityAriaLabel')}
        >
          {/* Weekday headers */}
          {WEEKDAYS.map((day, i) => (
            <div
              key={`header-${i}`}
              className={cn(
                'text-xs text-center font-medium pb-1',
                highContrast ? 'text-yellow-200' : 'text-slate-400',
              )}
              role="columnheader"
            >
              {day}
            </div>
          ))}
          {/* Calendar cells */}
          {calendarDays.map((day) => (
            <div
              key={day.date}
              className={cn(
                'aspect-square rounded-md flex items-center justify-center text-xs transition-colors',
                day.isActive
                  ? highContrast
                    ? 'bg-yellow-400 text-black font-bold'
                    : 'bg-primary text-white'
                  : highContrast
                    ? 'bg-yellow-400/10 text-yellow-200'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400',
                day.isToday && 'ring-2 ring-offset-1',
                day.isToday && (highContrast ? 'ring-yellow-400' : 'ring-primary'),
              )}
              title={day.date}
              role="gridcell"
              aria-label={`${day.date}${day.isActive ? ', attivo' : ''}${day.isToday ? ', oggi' : ''}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
