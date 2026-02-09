/**
 * Time Study Chart Component
 * Bar/area chart showing study time over different periods
 * Toggle: Today | Week | Month | Season
 * Stacked by subject with accessible alt table
 */

'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StudySession } from '@/lib/stores/progress-store';
import { SUBJECT_NAMES } from '@/data/maestri';

type TimePeriod = 'today' | 'week' | 'month' | 'season';

interface TimeStudyChartProps {
  sessions: StudySession[];
  className?: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  mathematics: '#8b5cf6',
  physics: '#06b6d4',
  chemistry: '#10b981',
  biology: '#84cc16',
  history: '#f59e0b',
  geography: '#14b8a6',
  italian: '#ec4899',
  english: '#f97316',
  art: '#6366f1',
  music: '#a855f7',
  civics: '#eab308',
  economics: '#3b82f6',
  computerScience: '#22c55e',
  philosophy: '#8b5cf6',
};

export function TimeStudyChart({ sessions, className }: TimeStudyChartProps) {
  const t = useTranslations('admin.dashboard.timeStudyChart');
  const [period, setPeriod] = useState<TimePeriod>('week');

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'season':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    const filteredSessions = sessions.filter(
      (s) => s.endedAt && new Date(s.startedAt) >= startDate,
    );

    const dataByDate = new Map<string, Record<string, number>>();

    filteredSessions.forEach((session) => {
      const dateKey = new Date(session.startedAt).toLocaleDateString('it-IT');
      const minutes = session.durationMinutes || 0;

      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, {});
      }

      const dateData = dataByDate.get(dateKey)!;
      const subject = session.subject;
      dateData[subject] = (dateData[subject] || 0) + minutes;
    });

    const chartPoints = Array.from(dataByDate.entries())
      .map(([date, subjects]) => ({
        date,
        ...subjects,
        total: Object.values(subjects).reduce((sum, val) => sum + val, 0),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return chartPoints;
  }, [sessions, period]);

  const subjects = useMemo(() => {
    const subjectSet = new Set<string>();
    chartData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== 'date' && key !== 'total') {
          subjectSet.add(key);
        }
      });
    });
    return Array.from(subjectSet);
  }, [chartData]);

  const totalMinutes = useMemo(() => {
    return chartData.reduce((sum, point) => sum + (point.total || 0), 0);
  }, [chartData]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("tempoDiStudio")}</CardTitle>
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'season'] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  period === p
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
                aria-pressed={period === p}
              >
                {p === 'today' && 'Oggi'}
                {p === 'week' && 'Settimana'}
                {p === 'month' && 'Mese'}
                {p === 'season' && 'Stagione'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("totale1")} {totalMinutes} {t("minuti2")}{Math.round(totalMinutes / 60)} {t("ore")}
        </p>
      </CardHeader>

      <CardContent>
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} aria-label={t('chartAriaLabel')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  label={{ value: 'Minuti', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    `${value || 0} min`,
                    SUBJECT_NAMES[name || ''] || name || '',
                  ]}
                />
                <Legend
                  formatter={(value) => SUBJECT_NAMES[value] || value}
                  wrapperStyle={{ fontSize: '12px' }}
                />
                {subjects.map((subject) => (
                  <Area
                    key={subject}
                    type="monotone"
                    dataKey={subject}
                    stackId="1"
                    stroke={SUBJECT_COLORS[subject] || '#8b5cf6'}
                    fill={SUBJECT_COLORS[subject] || '#8b5cf6'}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>

            {/* Accessible table for screen readers */}
            <table className="sr-only" aria-label={t("datiTempoDiStudio")}>
              <thead>
                <tr>
                  <th>{t("data")}</th>
                  {subjects.map((subject) => (
                    <th key={subject}>{SUBJECT_NAMES[subject] || subject}</th>
                  ))}
                  <th>{t("totale")}</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((point) => (
                  <tr key={point.date}>
                    <td>{point.date}</td>
                    {subjects.map((subject) => (
                      <td key={subject}>
                        {(point as Record<string, string | number>)[subject] || 0} {t("minuti1")}
                      </td>
                    ))}
                    <td>{point.total} {t("minuti")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-500">
            {t("nessunaSessioneDiStudioNelPeriodoSelezionato")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
