'use client';

/**
 * Knowledge Hub Homework Renderer
 *
 * Displays homework assignments and their completion status.
 *
 * Expected data format:
 * {
 *   title?: string;
 *   subject?: string;
 *   dueDate?: string;
 *   tasks: HomeworkTask[];
 *   completed?: boolean;
 * }
 */

import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, Circle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BaseRendererProps } from './index';

interface HomeworkTask {
  id: string;
  description: string;
  completed?: boolean;
}

interface HomeworkData {
  title?: string;
  subject?: string;
  dueDate?: string;
  tasks: HomeworkTask[];
  completed?: boolean;
  notes?: string;
}

/**
 * Render a homework assignment for Knowledge Hub.
 */
export function HomeworkRenderer({ data, className }: BaseRendererProps) {
  const homeworkData = data as unknown as HomeworkData;

  const title = homeworkData.title || 'Compiti';
  const tasks = homeworkData.tasks || [];
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              homeworkData.completed
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-amber-100 dark:bg-amber-900/30'
            )}
          >
            <BookOpen
              className={cn(
                'w-6 h-6',
                homeworkData.completed
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            {homeworkData.subject && (
              <span className="text-sm text-slate-500">{homeworkData.subject}</span>
            )}
          </div>
          <div className="text-sm text-slate-500">
            {completedCount}/{tasks.length}
          </div>
        </div>

        {homeworkData.dueDate && (
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            Scadenza: {homeworkData.dueDate}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="p-4 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-center text-slate-500">Nessun compito</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                'flex items-start gap-3 p-2 rounded-lg',
                task.completed && 'bg-green-50 dark:bg-green-900/10'
              )}
            >
              {task.completed ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
              )}
              <span
                className={cn(
                  'text-sm',
                  task.completed
                    ? 'text-slate-500 line-through'
                    : 'text-slate-700 dark:text-slate-300'
                )}
              >
                {task.description}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Notes */}
      {homeworkData.notes && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>Note:</strong> {homeworkData.notes}
          </p>
        </div>
      )}

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="px-4 pb-4">
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(completedCount / tasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
