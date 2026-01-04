/**
 * Leaderboard Component
 * Personal comparison across time periods
 * Prepared for multi-user expansion
 */

'use client';

import { useMemo, useState } from 'react';
import { useProgressStore } from '@/lib/stores/progress-store';
import { cn } from '@/lib/utils';

type TimePeriod = 'today' | 'week' | 'season' | 'year';

interface LeaderboardProps {
  showPeriodSelector?: boolean;
  defaultPeriod?: TimePeriod;
  className?: string;
}

interface LeaderboardEntry {
  label: string;
  mirrorBucks: number;
  level: number;
  studyMinutes: number;
  change?: number; // +/- change from comparison period
}

const PERIODS: TimePeriod[] = ['today', 'week', 'season', 'year'];

export function Leaderboard({ showPeriodSelector = true, defaultPeriod = 'week', className = '' }: LeaderboardProps) {
  const [period, setPeriod] = useState<TimePeriod>(defaultPeriod);
  const seasonMirrorBucks = useProgressStore((state) => state.seasonMirrorBucks);
  const mirrorBucks = useProgressStore((state) => state.mirrorBucks);
  const seasonLevel = useProgressStore((state) => state.seasonLevel);
  const allTimeLevel = useProgressStore((state) => state.allTimeLevel);
  const totalStudyMinutes = useProgressStore((state) => state.totalStudyMinutes);
  const seasonHistory = useProgressStore((state) => state.seasonHistory);
  const sessionHistory = useProgressStore((state) => state.sessionHistory);

  const entries = useMemo<LeaderboardEntry[]>(() => {
    // Calculate period-specific data from session history
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter sessions by period
    const filterSessions = (start: Date, end: Date) =>
      sessionHistory.filter((s) => {
        const date = new Date(s.startedAt);
        return date >= start && date < end;
      });

    const todaySessions = filterSessions(todayStart, now);
    const yesterdaySessions = filterSessions(yesterdayStart, todayStart);
    const weekSessions = filterSessions(weekStart, now);
    const lastWeekSessions = filterSessions(lastWeekStart, weekStart);

    const sumMB = (sessions: typeof sessionHistory) =>
      sessions.reduce((sum, s) => sum + (s.mirrorBucksEarned || 0), 0);
    const sumMinutes = (sessions: typeof sessionHistory) =>
      sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    // Get data based on period
    let currentMB = 0, currentMin = 0, prevMB = 0, prevMin = 0, currentLvl = 1, prevLvl = 1;

    switch (period) {
      case 'today':
        currentMB = sumMB(todaySessions);
        currentMin = sumMinutes(todaySessions);
        prevMB = sumMB(yesterdaySessions);
        prevMin = sumMinutes(yesterdaySessions);
        currentLvl = seasonLevel;
        prevLvl = seasonLevel;
        break;
      case 'week':
        currentMB = sumMB(weekSessions);
        currentMin = sumMinutes(weekSessions);
        prevMB = sumMB(lastWeekSessions);
        prevMin = sumMinutes(lastWeekSessions);
        currentLvl = seasonLevel;
        prevLvl = seasonLevel;
        break;
      case 'season':
        currentMB = seasonMirrorBucks;
        currentMin = totalStudyMinutes;
        currentLvl = seasonLevel;
        if (seasonHistory.length > 0) {
          prevMB = seasonHistory[0].mirrorBucksEarned;
          prevMin = seasonHistory[0].studyMinutes;
          prevLvl = seasonHistory[0].levelReached;
        }
        break;
      case 'year':
        currentMB = mirrorBucks;
        currentMin = totalStudyMinutes;
        currentLvl = allTimeLevel;
        // Sum all season history for previous year comparison
        const yearHistory = seasonHistory.slice(0, 4);
        prevMB = yearHistory.reduce((sum, s) => sum + s.mirrorBucksEarned, 0);
        prevMin = yearHistory.reduce((sum, s) => sum + s.studyMinutes, 0);
        prevLvl = Math.max(...yearHistory.map((s) => s.levelReached), 1);
        break;
    }

    const current: LeaderboardEntry = {
      label: getPeriodLabel(period, 'current'),
      mirrorBucks: currentMB,
      level: currentLvl,
      studyMinutes: currentMin,
      change: currentMB - prevMB,
    };

    const comparison: LeaderboardEntry = {
      label: getPeriodLabel(period, 'previous'),
      mirrorBucks: prevMB,
      level: prevLvl,
      studyMinutes: prevMin,
    };

    return [current, comparison];
  }, [period, seasonMirrorBucks, mirrorBucks, seasonLevel, allTimeLevel, totalStudyMinutes, seasonHistory, sessionHistory]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">I tuoi Progressi</h3>
      </div>

      {/* Period selector tabs */}
      {showPeriodSelector && (
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1 overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'flex-1 min-w-[60px] rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                period === p
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {getPeriodLabel(p, 'tab')}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {entries.map((entry, index) => (
          <LeaderboardRow
            key={entry.label}
            entry={entry}
            rank={index + 1}
            isCurrentPeriod={index === 0}
          />
        ))}
      </div>

      {entries[0].change !== undefined && (
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-sm text-muted-foreground">Differenza dalla stagione precedente</p>
          <p
            className={`text-2xl font-bold ${
              entries[0].change >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {entries[0].change >= 0 ? '+' : ''}
            {entries[0].change} MB
          </p>
        </div>
      )}
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentPeriod: boolean;
}

function LeaderboardRow({ entry, rank, isCurrentPeriod }: LeaderboardRowProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
        isCurrentPeriod
          ? 'border-blue-500/50 bg-blue-500/10'
          : 'border-muted bg-muted/30'
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
        {rank}
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium">{entry.label}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Livello {entry.level}</span>
          <span>•</span>
          <span>{entry.studyMinutes} min</span>
        </div>
      </div>

      <div className="text-right">
        <p className="text-lg font-semibold">{entry.mirrorBucks.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">MB</p>
      </div>
    </div>
  );
}

function getPeriodLabel(period: TimePeriod, type: 'current' | 'previous' | 'title' | 'tab'): string {
  const labels: Record<TimePeriod, Record<typeof type, string>> = {
    today: { current: 'Oggi', previous: 'Ieri', title: 'Oggi', tab: 'Oggi' },
    week: { current: 'Questa Settimana', previous: 'Settimana Scorsa', title: 'Settimana', tab: 'Settimana' },
    season: { current: 'Stagione Corrente', previous: 'Stagione Precedente', title: 'Stagione', tab: 'Stagione' },
    year: { current: 'Quest\'Anno', previous: 'Anno Scorso', title: 'Anno', tab: 'Anno' },
  };
  return labels[period][type];
}
