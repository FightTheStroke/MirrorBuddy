/**
 * Dashboard Page
 * Professional data-driven dashboard with all available telemetry
 * Row 1: StatCards (MirrorBucks, Level, Streak, Time Today)
 * Row 2: TimeStudyChart (span 2), MaestroUsageChart
 * Row 3: AchievementsPanel, SeasonBanner, AzureCostsCard
 */

'use client';

import { useEffect } from 'react';
import { Coins, Trophy, Flame, Clock } from 'lucide-react';
import { useProgressStore } from '@/lib/stores/progress-store';
import { DashboardLayout, DashboardCard } from '@/components/dashboard/dashboard-layout';
import { StatCard } from '@/components/dashboard/stat-card';
import { TimeStudyChart } from '@/components/dashboard/time-study-chart';
import { MaestroUsageChart } from '@/components/dashboard/maestro-usage-chart';
import { AzureCostsCard } from '@/components/dashboard/azure-costs-card';
import { AchievementsPanel } from '@/components/gamification/achievements-panel';
import { SeasonBanner } from '@/components/gamification/season-banner';

export default function DashboardPage() {
  const {
    mirrorBucks,
    level,
    streak,
    sessionHistory,
    totalStudyMinutes,
    loadFromServer,
  } = useProgressStore();

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  // Calculate time metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayMinutes = sessionHistory
    .filter((s) => s.endedAt && new Date(s.startedAt) >= today)
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const weeklyMinutes = sessionHistory
    .filter((s) => s.endedAt && new Date(s.startedAt) >= weekAgo)
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const lastWeekMinutes = sessionHistory
    .filter((s) => {
      const sessionDate = new Date(s.startedAt);
      return s.endedAt && sessionDate >= twoWeeksAgo && sessionDate < weekAgo;
    })
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const weeklyChange = lastWeekMinutes === 0
    ? (weeklyMinutes > 0 ? 100 : 0)
    : Math.round(((weeklyMinutes - lastWeekMinutes) / lastWeekMinutes) * 100);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Visualizzazione completa dei tuoi progressi e statistiche
        </p>
      </div>

      <DashboardLayout>
        {/* Row 1: Stats Cards */}
        <DashboardCard>
          <StatCard
            title="MirrorBucks"
            value={mirrorBucks}
            icon={<Coins className="w-6 h-6" />}
            color="amber"
          />
        </DashboardCard>

        <DashboardCard>
          <StatCard
            title="Livello"
            value={level}
            icon={<Trophy className="w-6 h-6" />}
            color="purple"
          />
        </DashboardCard>

        <DashboardCard>
          <StatCard
            title="Streak"
            value={streak.current}
            icon={<Flame className="w-6 h-6" />}
            color="orange"
          />
        </DashboardCard>

        <DashboardCard>
          <StatCard
            title="Tempo Oggi"
            value={`${todayMinutes} min`}
            change={weeklyChange}
            changeLabel="vs settimana scorsa"
            icon={<Clock className="w-6 h-6" />}
            color="blue"
          />
        </DashboardCard>

        {/* Row 2: Charts */}
        <DashboardCard span={2}>
          <TimeStudyChart sessions={sessionHistory} />
        </DashboardCard>

        <DashboardCard>
          <MaestroUsageChart sessions={sessionHistory} />
        </DashboardCard>

        {/* Row 3: Additional Info */}
        <DashboardCard>
          <div className="h-full">
            <AchievementsPanel compact className="h-full" />
          </div>
        </DashboardCard>

        <DashboardCard>
          <SeasonBanner variant="full" />
        </DashboardCard>

        <DashboardCard>
          <AzureCostsCard />
        </DashboardCard>
      </DashboardLayout>

      {/* Summary Stats */}
      <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Riepilogo Totali</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-500">Tempo totale</p>
            <p className="text-2xl font-bold">{Math.round(totalStudyMinutes / 60)}h</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Sessioni totali</p>
            <p className="text-2xl font-bold">{sessionHistory.length}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Media sessione</p>
            <p className="text-2xl font-bold">
              {sessionHistory.length > 0
                ? Math.round(totalStudyMinutes / sessionHistory.length)
                : 0}
              min
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Streak massimo</p>
            <p className="text-2xl font-bold">{streak.longest}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
