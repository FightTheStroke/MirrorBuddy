'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Flame,
  TrendingUp,
  Clock,
  Star,
  Calendar,
  Zap,
  Coins,
} from 'lucide-react';
import { useProgressStore } from '@/lib/stores';
import { AnalyticsDashboard, DashboardLayout, DashboardCard, StatCard } from '@/components/dashboard';
import { TimeStudyChart } from '@/components/dashboard/time-study-chart';
import { MaestroUsageChart } from '@/components/dashboard/maestro-usage-chart';
import { AchievementsPanel } from '@/components/gamification/achievements-panel';
import { SeasonBanner } from '@/components/gamification/season-banner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { ACHIEVEMENTS } from './progress-view/constants';
import { OverviewTab } from './progress-view/components/overview-tab';
import { AchievementsTab } from './progress-view/components/achievements-tab';
import { MasteryTab } from './progress-view/components/mastery-tab';
import { HistoryTab } from './progress-view/components/history-tab';

type ProgressTab = 'overview' | 'analytics' | 'achievements' | 'mastery' | 'history';

export function ProgressView() {
  const [activeTab, setActiveTab] = useState<ProgressTab>('overview');
  const { 
    xp, level, streak, totalStudyMinutes, masteries, achievements,
    mirrorBucks, sessionHistory, loadFromServer 
  } = useProgressStore();

  useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayMinutes = sessionHistory
    .filter((s) => s.endedAt && new Date(s.startedAt) >= today)
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const dateRange = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return { weekAgo, twoWeeksAgo };
  }, []);

  const weekAgo = dateRange.weekAgo;
  const twoWeeksAgo = dateRange.twoWeeksAgo;

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

  const tabs: Array<{ id: ProgressTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Panoramica', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <Zap className="w-4 h-4" /> },
    { id: 'achievements', label: 'Traguardi', icon: <Trophy className="w-4 h-4" /> },
    { id: 'mastery', label: 'Padronanza', icon: <Star className="w-4 h-4" /> },
    { id: 'history', label: 'Cronologia', icon: <Calendar className="w-4 h-4" /> },
  ];

  const xpToNextLevel = 1000;
  const currentLevelXP = xp % xpToNextLevel;
  const levelProgress = (currentLevelXP / xpToNextLevel) * 100;

  const _unlockedAchievementIds = (achievements || []).map(a => a.id);
  const _achievementProgress = (_unlockedAchievementIds.length / ACHIEVEMENTS.length) * 100;

  const masteriesRecord = useMemo(() => {
    const record: Record<string, typeof masteries[0]> = {};
    (masteries || []).forEach(m => {
      record[m.subject] = m;
    });
    return record;
  }, [masteries]);

  return (
    <div className="space-y-6">
      <PageHeader icon={Trophy} title="Progressi" />

      <DashboardLayout>
        <DashboardCard>
          <StatCard
            icon={<Coins className="w-6 h-6" />}
            label="MirrorBucks"
            value={mirrorBucks.toString()}
            subtext="Totale"
            color="amber"
          />
        </DashboardCard>

        <DashboardCard>
          <StatCard
            icon={<Trophy className="w-6 h-6" />}
            label="Livello"
            value={level.toString()}
            subtext={`${currentLevelXP} / ${xpToNextLevel} XP`}
            color="purple"
          />
        </DashboardCard>

        <DashboardCard>
          <StatCard
            icon={<Flame className="w-6 h-6" />}
            label="Streak"
            value={`${streak.current} giorni`}
            subtext={`Record: ${streak.longest}`}
            color="green"
          />
        </DashboardCard>

        <DashboardCard>
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Tempo Oggi"
            value={`${todayMinutes} min`}
            subtext={`${weeklyChange > 0 ? '+' : ''}${weeklyChange}% vs settimana scorsa`}
            color="blue"
          />
        </DashboardCard>

        <DashboardCard span={2}>
          <TimeStudyChart sessions={sessionHistory} />
        </DashboardCard>

        <DashboardCard>
          <MaestroUsageChart sessions={sessionHistory} />
        </DashboardCard>

        <DashboardCard>
          <div className="h-full">
            <AchievementsPanel compact className="h-full" />
          </div>
        </DashboardCard>

        <DashboardCard>
          <SeasonBanner variant="full" />
        </DashboardCard>
      </DashboardLayout>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-accent-themed text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <OverviewTab
            xp={xp}
            level={level}
            levelProgress={levelProgress}
            streak={streak}
            masteries={masteriesRecord}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsDashboard />}

        {activeTab === 'achievements' && (
          <AchievementsTab
            unlocked={_unlockedAchievementIds}
            allAchievements={ACHIEVEMENTS}
          />
        )}

        {activeTab === 'mastery' && (
          <MasteryTab masteries={masteriesRecord} />
        )}

        {activeTab === 'history' && <HistoryTab />}
      </motion.div>

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
