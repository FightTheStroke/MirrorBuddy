'use client';

import { cn } from '@/lib/utils';
import type { LearningStrategy } from '@/types';
import { CATEGORY_LABELS } from './constants';

interface StrategyCardProps {
  strategy: LearningStrategy;
}

const priorityColors = {
  high: 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10',
  medium: 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10',
  low: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10',
};

const priorityLabels = {
  high: 'Priorita Alta',
  medium: 'Priorita Media',
  low: 'Priorita Bassa',
};

export function StrategyCard({ strategy }: StrategyCardProps) {
  return (
    <div className={cn('p-4 rounded-lg border', priorityColors[strategy.priority])}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-900 dark:text-white">{strategy.title}</h4>
        <span className="text-xs text-slate-500">{priorityLabels[strategy.priority]}</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{strategy.description}</p>
      {strategy.forAreas.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {strategy.forAreas.map((area) => (
            <span
              key={area}
              className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              {CATEGORY_LABELS[area]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
