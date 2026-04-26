'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TopicStep } from '@/types';
import { STEP_CONFIG } from './constants';
import { StepContent } from './step-content';
import { useTranslations } from "next-intl";

interface StepCardProps {
  step: TopicStep;
  index: number;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onSelect: () => void;
}

export function StepCard({
  step,
  index,
  isActive,
  isExpanded,
  onToggle,
  onComplete,
  onSelect,
}: StepCardProps) {
  const t = useTranslations("education");
  const config = STEP_CONFIG[step.type] || STEP_CONFIG.overview;
  const Icon = config.icon;

  return (
    <motion.div
      initial={false}
      animate={{
        scale: isActive ? 1.02 : 1,
        opacity: step.isCompleted && !isActive ? 0.7 : 1,
      }}
      className={cn(
        'rounded-xl border transition-colors overflow-hidden',
        isActive
          ? 'border-primary bg-primary/5'
          : step.isCompleted
            ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      )}
    >
      {/* Header */}
      <button
        onClick={step.isCompleted ? onToggle : onSelect}
        className="w-full px-4 py-3 flex items-center gap-4 text-left"
      >
        {/* Status indicator */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            step.isCompleted
              ? 'bg-green-500 text-white'
              : isActive
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
          )}
        >
          {step.isCompleted ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <span className="text-sm font-medium">{index}</span>
          )}
        </div>

        {/* Step info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('p-1.5 rounded', config.color)}>
              <Icon className="w-4 h-4" />
            </span>
            <h4 className="font-medium text-slate-900 dark:text-white">{step.title}</h4>
          </div>
          <p className="text-xs text-slate-500 mt-1">{config.label}</p>
        </div>

        {/* Expand indicator */}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {(isExpanded || isActive) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
              <StepContent step={step} />
              {!step.isCompleted && (
                <Button onClick={onComplete} className="w-full mt-4">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t("completaPassaggio")}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
