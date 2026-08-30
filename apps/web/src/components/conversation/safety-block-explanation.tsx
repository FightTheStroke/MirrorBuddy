/**
 * SafetyBlockExplanation
 * Part of Ethical Design Hardening (F-06)
 *
 * Shown beneath an assistant message when the safety layer stopped the answer.
 * It tells the student, in child-friendly language, that something was stopped
 * and what to try instead — driven by the REAL filter outcome (see
 * resolveBlockExplanation) and never revealing the exact trigger.
 *
 * Accessibility (WCAG 2.1 AA, DSA profiles):
 * - role="status" + aria-live="polite": announced to a screen reader without
 *   stealing focus.
 * - No animation, no timers: it never auto-moves and never auto-dismisses,
 *   which matters for students with attention or motor differences.
 * - Static text with a decorative (aria-hidden) icon; nothing to trap the
 *   keyboard, and colour pairings meet the 4.5:1 contrast requirement.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Info, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveBlockExplanation } from '@/lib/safety/ui';

export interface SafetyBlockExplanationProps {
  /** Raw internal filter category from the safety layer (e.g. 'pii', 'stem_x'). */
  category?: string | null;
  className?: string;
}

export function SafetyBlockExplanation({ category, className }: SafetyBlockExplanationProps) {
  const t = useTranslations('safetyBlock');
  const { category: bucket, suggestAskAdult } = resolveBlockExplanation(category);

  const Icon = suggestAskAdult ? LifeBuoy : Info;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('heading')}
      data-testid="safety-block-explanation"
      data-category={bucket}
      className={cn(
        'mt-2 flex gap-3 rounded-xl border p-3 text-left',
        'border-amber-300 bg-amber-50 text-slate-900',
        'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700 dark:text-amber-300"
      />
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t(`categories.${bucket}.title`)}</p>
        <p className="text-sm">{t(`categories.${bucket}.message`)}</p>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {t(`categories.${bucket}.action`)}
        </p>
      </div>
    </div>
  );
}
