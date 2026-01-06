import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Calendar, Flame, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaderboard } from '@/components/gamification';
import { XPInfo } from '@/components/gamification';
import { subjectNames, subjectColors, subjectIcons } from '@/data';
import type { Subject } from '@/types';

interface OverviewTabProps {
  xp: number;
  level: number;
  levelProgress: number;
  streak: { current: number; longest: number; lastStudyDate?: Date };
  masteries: Record<string, { tier?: string; progress?: number; percentage?: number; topicsCompleted?: number }>;
}

export function OverviewTab({ xp, level, levelProgress, streak, masteries }: OverviewTabProps) {
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const streakCalendarData = useMemo(() => {
    const today = new Date();
    const lastStudy = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null;

    return Array.from({ length: 28 }).map((_, i) => {
      const daysAgo = 27 - i;
      if (lastStudy && streak.current > 0) {
        const dayDate = new Date(today);
        dayDate.setDate(dayDate.getDate() - daysAgo);
        const lastStudyDaysAgo = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24));
        const streakStartDaysAgo = lastStudyDaysAgo + streak.current - 1;
        return daysAgo >= lastStudyDaysAgo && daysAgo <= streakStartDaysAgo;
      }
      return false;
    });
  }, [streak]);

  const weeklyData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const today = new Date().getDay();
    return Array.from({ length: 7 }).map((_, i) => {
      const dayIndex = (today - 6 + i + 7) % 7;
      return { day: days[dayIndex], minutes: 0 };
    });
  }, []);

  const maxMinutes = Math.max(...weeklyData.map(d => d.minutes), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  className="w-full bg-accent-themed rounded-t"
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
                className={`aspect-square rounded-sm ${
                  isActive ? 'bg-orange-400' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-slate-500">4 settimane fa</span>
            <span className="text-slate-500">Oggi</span>
          </div>
        </CardContent>
      </Card>

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

      <Card>
        <CardContent className="p-4">
          <Leaderboard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Come Guadagnare MB</CardTitle>
        </CardHeader>
        <CardContent>
          <XPInfo />
        </CardContent>
      </Card>
    </div>
  );
}

