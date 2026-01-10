'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Calendar,
  Star,
  Target,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DiaryEntry } from './teacher-diary';
import {
  calculateWeeklyData,
  calculateImprovements,
} from './progress-timeline-utils';

interface ProgressTimelineProps {
  entries: DiaryEntry[];
  studentName: string;
}

/**
 * ProgressTimeline - Progressi nel Tempo
 *
 * Shows student progress over time with:
 * - Weekly activity chart
 * - Strengths vs growth areas trend
 * - Key milestones and improvements
 */
export function ProgressTimeline({ entries, studentName }: ProgressTimelineProps) {
  // Group entries by week
  const weeklyData = useMemo(() => calculateWeeklyData(entries), [entries]);

  // Calculate improvements
  const improvements = useMemo(() => calculateImprovements(weeklyData), [weeklyData]);

  // Get max value for chart scaling
  const maxValue = Math.max(...weeklyData.map(w => w.total), 1);

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Progressi nel Tempo
          </h3>
          <p className="text-sm text-slate-500">
            I progressi verranno visualizzati dopo le prime sessioni con i Professori.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Progressi nel Tempo
        </CardTitle>
        <CardDescription>
          Andamento delle osservazioni dei Professori su {studentName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Improvements Summary */}
        {improvements && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={cn(
              'p-4 rounded-xl border',
              improvements.strengthsTrend > 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Star className={cn('h-4 w-4', improvements.strengthsTrend > 0 ? 'text-green-500' : 'text-slate-400')} />
                <span className="text-sm font-medium">Punti di Forza</span>
              </div>
              <p className={cn(
                'text-lg font-bold',
                improvements.strengthsTrend > 0 ? 'text-green-600' : 'text-slate-600'
              )}>
                {improvements.strengthsTrend > 0 ? '+' : ''}{improvements.strengthsTrend.toFixed(1)} /settimana
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {improvements.strengthsTrend > 0 ? 'In aumento' : improvements.strengthsTrend < 0 ? 'In calo' : 'Stabile'}
              </p>
            </div>

            <div className={cn(
              'p-4 rounded-xl border',
              improvements.activityTrend > 0
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Activity className={cn('h-4 w-4', improvements.activityTrend > 0 ? 'text-blue-500' : 'text-slate-400')} />
                <span className="text-sm font-medium">Attivita</span>
              </div>
              <p className={cn(
                'text-lg font-bold',
                improvements.activityTrend > 0 ? 'text-blue-600' : 'text-slate-600'
              )}>
                {improvements.activityTrend > 0 ? '+' : ''}{improvements.activityTrend.toFixed(1)} /settimana
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {improvements.activityTrend > 0 ? 'Piu attivo' : improvements.activityTrend < 0 ? 'Meno attivo' : 'Costante'}
              </p>
            </div>

            <div className={cn(
              'p-4 rounded-xl border',
              improvements.moreStrengthsThanGrowth
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Target className={cn('h-4 w-4', improvements.moreStrengthsThanGrowth ? 'text-amber-500' : 'text-slate-400')} />
                <span className="text-sm font-medium">Tendenza</span>
              </div>
              <p className={cn(
                'text-lg font-bold',
                improvements.moreStrengthsThanGrowth ? 'text-amber-600' : 'text-slate-600'
              )}>
                {improvements.moreStrengthsThanGrowth ? 'Positiva' : 'In crescita'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {improvements.moreStrengthsThanGrowth
                  ? 'Piu punti di forza che aree di crescita'
                  : 'Focus su aree di miglioramento'
                }
              </p>
            </div>
          </div>
        )}

        {/* Weekly Chart */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-slate-600 dark:text-slate-400">Punti di forza</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <span className="text-slate-600 dark:text-slate-400">Aree di crescita</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <Calendar className="h-4 w-4" />
              <span>Ultime {weeklyData.length} settimane</span>
            </div>
          </div>

          <div className="flex items-end gap-2 h-32">
            {weeklyData.map((week, idx) => (
              <div
                key={week.weekLabel}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="w-full flex flex-col gap-0.5" style={{ height: '100px' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(week.strengths / maxValue) * 100}%` }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className="w-full bg-amber-400 rounded-t-sm"
                    title={`${week.strengths} punti di forza`}
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(week.growthAreas / maxValue) * 100}%` }}
                    transition={{ delay: idx * 0.05 + 0.1, duration: 0.3 }}
                    className="w-full bg-blue-400 rounded-b-sm"
                    title={`${week.growthAreas} aree di crescita`}
                  />
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {week.weekLabel}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Total stats */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Totale osservazioni nel periodo:
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {entries.length} ({entries.filter(e => e.isStrength).length} punti di forza, {entries.filter(e => !e.isStrength).length} aree di crescita)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProgressTimeline;
