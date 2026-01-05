'use client';

/**
 * Learning Paths List
 * Shows all learning paths for the current user
 * Plan 8 MVP - Wave 4: UI Integration [F-24]
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Route,
  Clock,
  CheckCircle2,
  ChevronRight,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { LearningPath } from '@/types';

interface LearningPathsListProps {
  onSelect?: (pathId: string) => void;
  className?: string;
}

export function LearningPathsList({ onSelect, className }: LearningPathsListProps) {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaths = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/learning-path');
        if (!response.ok) {
          throw new Error('Failed to load learning paths');
        }
        const data = await response.json();
        setPaths(data.paths || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchPaths();
  }, []);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">
          Caricamento percorsi...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (paths.length === 0) {
    return (
      <div className={cn('text-center py-16', className)}>
        <Route className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Nessun percorso creato
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
          Carica un PDF nello Study Kit e genera il tuo primo percorso di apprendimento
          progressivo!
        </p>
        <Button onClick={() => window.location.href = '/study-kit'} className="gap-2">
          <BookOpen className="w-4 h-4" />
          Vai allo Study Kit
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {paths.length} {paths.length === 1 ? 'percorso' : 'percorsi'} di apprendimento
      </div>

      {paths.map((path, index) => (
        <PathCard
          key={path.id}
          path={path}
          index={index}
          onClick={() => onSelect?.(path.id)}
        />
      ))}
    </div>
  );
}

interface PathCardProps {
  path: LearningPath;
  index: number;
  onClick: () => void;
}

function PathCard({ path, onClick }: PathCardProps) {
  const isCompleted = path.status === 'completed';
  const isInProgress = path.status === 'in_progress';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl border p-5 cursor-pointer transition-all',
        isCompleted
          ? 'border-green-200 dark:border-green-800'
          : 'border-slate-200 dark:border-slate-700 hover:border-primary'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
            isCompleted
              ? 'bg-green-100 dark:bg-green-900/30'
              : isInProgress
                ? 'bg-orange-100 dark:bg-orange-900/30'
                : 'bg-primary/10'
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          ) : (
            <Route
              className={cn(
                'w-6 h-6',
                isInProgress
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-primary'
              )}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                {path.title}
              </h3>
              {path.subject && (
                <p className="text-sm text-slate-500 mt-0.5">{path.subject}</p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
          </div>

          {/* Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                {path.completedTopics}/{path.totalTopics} argomenti
              </span>
              <span className="font-medium text-primary">{path.progressPercent}%</span>
            </div>
            <Progress value={path.progressPercent} className="h-2" />
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            {path.estimatedTotalMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{path.estimatedTotalMinutes} min
              </span>
            )}
            <span
              className={cn(
                'px-2 py-0.5 rounded-full',
                isCompleted
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : isInProgress
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              )}
            >
              {isCompleted ? 'Completato' : isInProgress ? 'In corso' : 'Da iniziare'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export { PathCard };
