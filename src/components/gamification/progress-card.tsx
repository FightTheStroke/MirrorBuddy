'use client';

import { motion } from 'framer-motion';
import { Flame, Trophy, BookOpen, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Progress } from '@/types';

interface ProgressCardProps {
  progress: Progress;
  className?: string;
}

export function ProgressCard({ progress, className }: ProgressCardProps) {
  const xpProgress = (progress.xp % progress.xpToNextLevel) / progress.xpToNextLevel * 100;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        {/* Level and XP */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <span className="text-xl font-bold text-white">{progress.level}</span>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Livello</p>
              <p className="font-semibold">Studente {getLevelTitle(progress.level)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-purple-600">{progress.xp.toLocaleString()}</p>
            <p className="text-xs text-slate-500">XP totali</p>
          </div>
        </div>

        {/* XP Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Prossimo livello</span>
            <span>{progress.xpToNextLevel - (progress.xp % progress.xpToNextLevel)} XP rimanenti</span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4">
          <StatItem
            icon={<Flame className="w-5 h-5 text-orange-500" />}
            value={progress.streak.current}
            label="Streak"
            highlight={progress.streak.current >= 7}
          />
          <StatItem
            icon={<Trophy className="w-5 h-5 text-amber-500" />}
            value={progress.achievements.filter(a => a.unlockedAt).length}
            label="Trofei"
          />
          <StatItem
            icon={<BookOpen className="w-5 h-5 text-blue-500" />}
            value={progress.sessionsThisWeek}
            label="Sessioni"
          />
          <StatItem
            icon={<Zap className="w-5 h-5 text-purple-500" />}
            value={progress.questionsAsked}
            label="Domande"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  highlight?: boolean;
}

function StatItem({ icon, value, label, highlight }: StatItemProps) {
  return (
    <div className={cn(
      'text-center p-3 rounded-xl',
      highlight ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-slate-50 dark:bg-slate-800/50'
    )}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function getLevelTitle(level: number): string {
  if (level < 5) return 'Principiante';
  if (level < 10) return 'Apprendista';
  if (level < 20) return 'Studioso';
  if (level < 30) return 'Esperto';
  if (level < 50) return 'Professore';
  return 'Genio';
}
