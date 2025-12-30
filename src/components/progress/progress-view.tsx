'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Flame,
  TrendingUp,
  Clock,
  Star,
  BookOpen,
  Award,
  Calendar,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProgressStore } from '@/lib/stores/app-store';
import { cn } from '@/lib/utils';
import { subjectNames, subjectColors, subjectIcons } from '@/data';
import type { Subject } from '@/types';

type ProgressTab = 'overview' | 'achievements' | 'mastery' | 'history';

const ACHIEVEMENTS = [
  { id: 'first_session', name: 'Prima Lezione', desc: 'Completa la tua prima sessione', icon: '🎓', xp: 50 },
  { id: 'streak_3', name: 'Costanza', desc: 'Mantieni una streak di 3 giorni', icon: '🔥', xp: 100 },
  { id: 'streak_7', name: 'Determinazione', desc: 'Mantieni una streak di 7 giorni', icon: '💪', xp: 250 },
  { id: 'streak_30', name: 'Inarrestabile', desc: 'Mantieni una streak di 30 giorni', icon: '🚀', xp: 1000 },
  { id: 'quiz_10', name: 'Quiz Master', desc: 'Completa 10 quiz', icon: '🧠', xp: 150 },
  { id: 'flashcards_100', name: 'Memoria di Ferro', desc: 'Rivedi 100 flashcards', icon: '📚', xp: 200 },
  { id: 'math_master', name: 'Genio Matematico', desc: 'Raggiungi livello esperto in matematica', icon: '🔢', xp: 500 },
  { id: 'polyglot', name: 'Poliglotta', desc: 'Studia 3 lingue diverse', icon: '🌍', xp: 300 },
  { id: 'night_owl', name: 'Gufo Notturno', desc: 'Studia dopo le 22:00', icon: '🦉', xp: 50 },
  { id: 'early_bird', name: 'Mattiniero', desc: 'Studia prima delle 7:00', icon: '🐦', xp: 50 },
  { id: 'study_marathon', name: 'Maratona', desc: 'Studia per 2 ore consecutive', icon: '⏱️', xp: 200 },
  { id: 'perfectionist', name: 'Perfezionista', desc: 'Ottieni 100% in un quiz', icon: '💯', xp: 100 },
];

export function ProgressView() {
  const [activeTab, setActiveTab] = useState<ProgressTab>('overview');
  const { xp, level, streak, totalStudyMinutes, masteries, achievements } = useProgressStore();

  const tabs: Array<{ id: ProgressTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Panoramica', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'achievements', label: 'Traguardi', icon: <Trophy className="w-4 h-4" /> },
    { id: 'mastery', label: 'Padronanza', icon: <Star className="w-4 h-4" /> },
    { id: 'history', label: 'Cronologia', icon: <Calendar className="w-4 h-4" /> },
  ];

  const xpToNextLevel = 1000;
  const currentLevelXP = xp % xpToNextLevel;
  const levelProgress = (currentLevelXP / xpToNextLevel) * 100;

  // Convert achievements array to IDs for the tab
  const unlockedAchievementIds = (achievements || []).map(a => a.id);
  const achievementProgress = (unlockedAchievementIds.length / ACHIEVEMENTS.length) * 100;

  // Convert masteries array to Record for easier lookup
  const masteriesRecord = useMemo(() => {
    const record: Record<string, typeof masteries[0]> = {};
    (masteries || []).forEach(m => {
      record[m.subject] = m;
    });
    return record;
  }, [masteries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          I Tuoi Progressi
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Monitora il tuo percorso di apprendimento
        </p>
      </div>

      {/* Quick Stats */}
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
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

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'amber' | 'orange' | 'blue' | 'purple' | 'green';
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  const colorClasses = {
    amber: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20',
    orange: 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20',
    blue: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
    purple: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
    green: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
  };

  return (
    <Card className={cn('bg-gradient-to-br', colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Overview Tab
interface OverviewTabProps {
  xp: number;
  level: number;
  levelProgress: number;
  streak: { current: number; longest: number; lastStudyDate?: Date };
  masteries: Record<string, { tier?: string; progress?: number; percentage?: number; topicsCompleted?: number }>;
}

function OverviewTab({ xp, level, levelProgress, streak, masteries }: OverviewTabProps) {
  // Generate streak calendar data based on ACTUAL streak data
  // Shows last 28 days, with streak.current consecutive days marked as active
  const streakCalendarData = useMemo(() => {
    const today = new Date();
    const lastStudy = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;

    return Array.from({ length: 28 }).map((_, i) => {
      // Days from oldest (27 days ago) to today (0)
      const daysAgo = 27 - i;

      // If we have a lastStudyDate, mark consecutive days back from it
      if (lastStudy && streak.current > 0) {
        const dayDate = new Date(today);
        dayDate.setDate(dayDate.getDate() - daysAgo);

        // Check if this day falls within the current streak
        const lastStudyDaysAgo = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));
        const streakStartDaysAgo = lastStudyDaysAgo + streak.current - 1;

        return daysAgo >= lastStudyDaysAgo && daysAgo <= streakStartDaysAgo;
      }

      return false; // No activity if no streak data
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler infers streak.current
  }, [streak.current, streak.lastStudyDate]);

  // Weekly activity data - calculate from actual session history
  // Currently shows empty data - will be populated when backend session tracking is implemented
  // See: BACKEND_IMPLEMENTATION_PLAN.md for session history integration
  const weeklyData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const today = new Date().getDay();

    // Rotate days array to start from today - 6 days
    return Array.from({ length: 7 }).map((_, i) => {
      const dayIndex = (today - 6 + i + 7) % 7;
      return { day: days[dayIndex], minutes: 0 }; // Real data should come from props
    });
  }, []);

  const maxMinutes = Math.max(...weeklyData.map(d => d.minutes), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Progressione Livello
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
              {level}
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500 mb-1">
                {xp.toLocaleString()} XP totali
              </p>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {(1000 - (xp % 1000)).toLocaleString()} XP per il livello {level + 1}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Attivita Settimanale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between h-32 gap-2">
            {weeklyData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  className="w-full bg-blue-500 rounded-t"
                  initial={{ height: 0 }}
                  animate={{ height: `${(day.minutes / maxMinutes) * 100}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  style={{ minHeight: day.minutes > 0 ? '8px' : '0px' }}
                />
                <span className="text-xs text-slate-500">{day.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Streak Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Calendario Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {streakCalendarData.map((isActive, i) => (
              <div
                key={i}
                className={cn(
                  'aspect-square rounded-sm',
                  isActive
                    ? 'bg-orange-400'
                    : 'bg-slate-200 dark:bg-slate-700'
                )}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-slate-500">4 settimane fa</span>
            <span className="text-slate-500">Oggi</span>
          </div>
        </CardContent>
      </Card>

      {/* Top Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-500" />
            Materie Principali
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(masteries || {}).slice(0, 4).map(([subject, data]) => (
            <div key={subject} className="flex items-center gap-3">
              <span className="text-2xl">{subjectIcons[subject as Subject]}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{subjectNames[subject as Subject]}</span>
                  <span className="text-xs text-slate-500">{data?.tier || 'beginner'}</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${data?.progress || 0}%`,
                      backgroundColor: subjectColors[subject as Subject],
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Achievements Tab
interface AchievementsTabProps {
  unlocked: string[];
  allAchievements: typeof ACHIEVEMENTS;
}

function AchievementsTab({ unlocked, allAchievements }: AchievementsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {allAchievements.map(achievement => {
        const isUnlocked = unlocked.includes(achievement.id);
        return (
          <Card
            key={achievement.id}
            className={cn(
              'transition-all',
              isUnlocked
                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800'
                : 'opacity-60'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'text-4xl',
                    !isUnlocked && 'grayscale'
                  )}
                >
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {achievement.name}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {achievement.desc}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-600">
                      +{achievement.xp} XP
                    </span>
                  </div>
                </div>
                {isUnlocked && (
                  <Award className="w-6 h-6 text-amber-500" />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Mastery Tab
interface MasteryTabProps {
  masteries: Record<string, { tier?: string; progress?: number; percentage?: number; topicsCompleted?: number }>;
}

function MasteryTab({ masteries }: MasteryTabProps) {
  const tiers = ['beginner', 'intermediate', 'advanced', 'expert', 'master'];
  const tierLabels: Record<string, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzato',
    expert: 'Esperto',
    master: 'Maestro',
  };

  const subjects: Subject[] = ['mathematics', 'physics', 'chemistry', 'biology', 'history', 'geography', 'italian', 'english', 'art', 'music'];

  return (
    <div className="space-y-6">
      {subjects.map(subject => {
        const data = masteries?.[subject] || { tier: 'beginner', progress: 0, topicsCompleted: 0 };
        const tier = data.tier || 'beginner';
        const tierIndex = tiers.indexOf(tier);

        return (
          <Card key={subject}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${subjectColors[subject]}20` }}
                >
                  {subjectIcons[subject]}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {subjectNames[subject]}
                    </h4>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${subjectColors[subject]}20`,
                        color: subjectColors[subject],
                      }}
                    >
                      {tierLabels[tier]}
                    </span>
                  </div>

                  {/* Tier Progress */}
                  <div className="flex gap-1 mb-2">
                    {tiers.map((t, i) => (
                      <div
                        key={t}
                        className={cn(
                          'flex-1 h-2 rounded-full',
                          i <= tierIndex
                            ? 'bg-gradient-to-r'
                            : 'bg-slate-200 dark:bg-slate-700'
                        )}
                        style={i <= tierIndex ? {
                          backgroundImage: `linear-gradient(to right, ${subjectColors[subject]}, ${subjectColors[subject]})`
                        } : {}}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{data.topicsCompleted || 0} argomenti completati</span>
                    <span>{data.progress || data.percentage || 0}% al prossimo livello</span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// History Tab - uses REAL data from sessionHistory store
function HistoryTab() {
  const { sessionHistory } = useProgressStore();

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: Map<string, typeof sessionHistory> = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    sessionHistory
      .filter(s => s.endedAt) // Only completed sessions
      .forEach(session => {
        const sessionDate = new Date(session.startedAt);
        sessionDate.setHours(0, 0, 0, 0);

        let dateKey: string;
        if (sessionDate.getTime() === today.getTime()) {
          dateKey = 'Oggi';
        } else if (sessionDate.getTime() === yesterday.getTime()) {
          dateKey = 'Ieri';
        } else {
          const daysAgo = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysAgo < 7) {
            dateKey = `${daysAgo} giorni fa`;
          } else {
            dateKey = sessionDate.toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
            });
          }
        }

        if (!groups.has(dateKey)) {
          groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(session);
      });

    return groups;
  }, [sessionHistory]);

  // Empty state when no sessions
  if (sessionHistory.filter(s => s.endedAt).length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
            Nessuna sessione registrata
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Inizia una sessione di studio per vedere la tua cronologia!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(groupedSessions.entries()).map(([dateLabel, sessions]) => (
        <div key={dateLabel}>
          <h3 className="text-sm font-medium text-slate-500 mb-3">{dateLabel}</h3>
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${subjectColors[session.subject as Subject] || '#6366f1'}20` }}
                    >
                      {subjectIcons[session.subject as Subject] || '📚'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        {subjectNames[session.subject as Subject] || session.subject || 'Studio'}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {session.maestroId ? `Maestro ${session.maestroId}` : 'Sessione di studio'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {session.durationMinutes || 0} min
                      </p>
                      <p className="text-sm text-slate-500">
                        +{session.xpEarned || 0} XP
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Utility function
function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
