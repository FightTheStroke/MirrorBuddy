'use client';

/**
 * Knowledge Hub Stats Panel
 *
 * Displays statistics about the user's materials.
 */

import {
  Brain,
  HelpCircle,
  Layers,
  FileText,
  Clock,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MaterialStats {
  totalMaterials: number;
  byType: {
    mindmap: number;
    quiz: number;
    flashcard: number;
    summary: number;
    other: number;
  };
  recentCount: number;
  thisWeekCount: number;
}

export interface StatsPanelProps {
  /** Material statistics */
  stats: MaterialStats;
  /** Additional CSS classes */
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: string;
}

function StatCard({ icon, label, value, color = 'text-accent-themed' }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className={cn('p-2 rounded-lg bg-white dark:bg-slate-800', color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {value}
        </p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

/**
 * Statistics panel for Knowledge Hub overview.
 */
export function StatsPanel({ stats, className }: StatsPanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden',
        className
      )}
      role="region"
      aria-label="Statistiche materiali"
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-accent-themed/10 to-purple-500/10 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          Le tue statistiche
        </h3>
        <p className="text-sm text-slate-500">
          {stats.totalMaterials} materiali totali
        </p>
      </div>

      {/* Stats grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={<Brain className="w-5 h-5" />}
          label="Mappe mentali"
          value={stats.byType.mindmap}
          color="text-blue-500"
        />
        <StatCard
          icon={<HelpCircle className="w-5 h-5" />}
          label="Quiz"
          value={stats.byType.quiz}
          color="text-green-500"
        />
        <StatCard
          icon={<Layers className="w-5 h-5" />}
          label="Flashcard"
          value={stats.byType.flashcard}
          color="text-amber-500"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Riassunti"
          value={stats.byType.summary}
          color="text-purple-500"
        />
      </div>

      {/* Activity */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">
              Oggi: <strong className="text-slate-900 dark:text-slate-100">{stats.recentCount}</strong>
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">
              Questa settimana: <strong className="text-slate-900 dark:text-slate-100">{stats.thisWeekCount}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
