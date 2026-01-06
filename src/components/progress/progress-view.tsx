'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Flame,
  TrendingUp,
  Clock,
  Star,
  Calendar,
  Zap,
} from 'lucide-react';
import { useProgressStore } from '@/lib/stores';
import { AnalyticsDashboard } from '@/components/dashboard';
import { cn } from '@/lib/utils';
import { ACHIEVEMENTS, formatMinutes } from './progress-view/constants';
import { StatCard } from './progress-view/components/stat-card';
import { OverviewTab } from './progress-view/components/overview-tab';
import { AchievementsTab } from './progress-view/components/achievements-tab';
import { MasteryTab } from './progress-view/components/mastery-tab';
import { HistoryTab } from './progress-view/components/history-tab';

type ProgressTab = 'overview' | 'analytics' | 'achievements' | 'mastery' | 'history';

export function ProgressView() {
  const [activeTab, setActiveTab] = useState<ProgressTab>('overview');
  const { xp, level, streak, totalStudyMinutes, masteries, achievements } = useProgressStore();

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

  const unlockedAchievementIds = (achievements || []).map(a => a.id);
  const achievementProgress = (unlockedAchievementIds.length / ACHIEVEMENTS.length) * 100;

  const masteriesRecord = useMemo(() => {
    const record: Record<string, typeof masteries[0]> = {};
    (masteries || []).forEach(m => {
      record[m.subject] = m;
    });
    return record;
  }, [masteries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          I Tuoi Progressi
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Monitora il tuo percorso di apprendimento
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Zap className="w-6 h-6 text-amber-500" />}
          label="Livello"
          value={level.toString()}
          subtext={`${currentLevelXP} / ${xpToNextLevel} XP`}
          color="amber"
        />
        <StatCard
          icon={<Flame className="w-6 h-6 text-orange-500" />}
          label="Streak"
          value={`${streak.current} giorni`}
          subtext={`Record: ${streak.longest}`}
          color="orange"
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-blue-500" />}
          label="Tempo Studio"
          value={formatMinutes(totalStudyMinutes)}
          subtext="Totale"
          color="blue"
        />
        <StatCard
          icon={<Trophy className="w-6 h-6 text-purple-500" />}
          label="Traguardi"
          value={`${unlockedAchievementIds.length}/${ACHIEVEMENTS.length}`}
          subtext={`${achievementProgress.toFixed(0)}%`}
          color="purple"
        />
      </div>

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
            unlocked={unlockedAchievementIds}
            allAchievements={ACHIEVEMENTS}
          />
        )}

        {activeTab === 'mastery' && (
          <MasteryTab masteries={masteriesRecord} />
        )}

        {activeTab === 'history' && <HistoryTab />}
      </motion.div>
    </div>
  );
}
