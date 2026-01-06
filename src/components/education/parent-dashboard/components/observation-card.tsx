import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import type { MaestroObservation } from '@/types';

interface ObservationCardProps {
  observation: MaestroObservation;
  isStrength: boolean;
}

export function ObservationCard({ observation, isStrength }: ObservationCardProps) {
  const { settings } = useAccessibilityStore();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-lg border',
        settings.highContrast
          ? 'border-yellow-400 bg-gray-900'
          : isStrength
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
            : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'text-sm font-medium',
                settings.highContrast
                  ? 'text-yellow-400'
                  : isStrength
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
              )}
            >
              {observation.maestroName}
            </span>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                settings.highContrast
                  ? 'bg-gray-800 text-gray-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              )}
            >
              {Math.round(observation.confidence * 100)}% sicuro
            </span>
          </div>
          <p
            className={cn(
              'text-sm',
              settings.highContrast ? 'text-white' : 'text-slate-700 dark:text-slate-300'
            )}
          >
            {observation.observation}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700"
          >
            <p className="text-xs text-slate-500">
              Osservato il {observation.createdAt.toLocaleDateString('it-IT')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

