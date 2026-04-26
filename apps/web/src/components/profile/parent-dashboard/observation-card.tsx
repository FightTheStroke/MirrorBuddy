'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MaestroObservation } from '@/types';
import { CATEGORY_LABELS } from './constants';
import { useTranslations } from "next-intl";

interface ObservationCardProps {
  observation: MaestroObservation;
  isStrength: boolean;
  showPriority?: boolean;
  priorityLevel?: 'high' | 'medium' | 'low';
}

const priorityConfig = {
  high: {
    label: 'Priorita Alta',
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  },
  medium: {
    label: 'Priorita Media',
    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  low: {
    label: 'Priorita Bassa',
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  },
};

export function ObservationCard({
  observation,
  isStrength,
  showPriority = false,
  priorityLevel = 'medium',
}: ObservationCardProps) {
  const t = useTranslations("settings");
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-3 rounded-lg border',
        isStrength
          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
          : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
        showPriority && priorityLevel === 'high' && 'ring-2 ring-red-300 dark:ring-red-700'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              isStrength
                ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
            )}>
              {CATEGORY_LABELS[observation.category]}
            </span>
            {showPriority && !isStrength && (
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full border',
                priorityConfig[priorityLevel].className
              )}>
                {priorityConfig[priorityLevel].label}
              </span>
            )}
          </div>
          <p className="text-sm mt-2 text-slate-700 dark:text-slate-300">
            {observation.observation}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        {t("osservatoDa")} {observation.maestroName}
      </p>
    </motion.div>
  );
}
