/**
 * @file step-card.tsx
 * @brief Step card component for homework steps
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HomeworkStep } from '@/types';

interface StepCardProps {
  step: HomeworkStep;
  index: number;
  isExpanded: boolean;
  hintsShown: number;
  onToggle: () => void;
  onShowHint: () => void;
  onComplete: () => void;
}

export function StepCard({
  step,
  index,
  isExpanded,
  hintsShown,
  onToggle,
  onShowHint,
  onComplete,
}: StepCardProps) {
  return (
    <Card
      className={cn(
        'transition-all',
        step.completed &&
          'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
      )}
    >
      <CardContent className="p-4">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 text-left"
        >
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
              step.completed
                ? 'bg-green-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            )}
          >
            {step.completed ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          <span
            className={cn(
              'flex-1 font-medium',
              step.completed && 'text-green-700 dark:text-green-400'
            )}
          >
            {step.description}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && !step.completed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                {hintsShown > 0 && (
                  <div className="space-y-2 mb-4">
                    {step.hints.slice(0, hintsShown).map((hint, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                      >
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5" />
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            {hint}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  {hintsShown < step.hints.length ? (
                    <Button variant="ghost" size="sm" onClick={onShowHint}>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Suggerimento ({hintsShown + 1}/{step.hints.length})
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Tutti i suggerimenti mostrati
                    </span>
                  )}
                  <Button size="sm" onClick={onComplete}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Fatto
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

