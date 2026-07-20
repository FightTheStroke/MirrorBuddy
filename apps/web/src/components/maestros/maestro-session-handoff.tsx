'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Volume2, X } from 'lucide-react';
import { useTTS } from '@/components/accessibility';
import type { Intent } from '@/app/[locale]/types';

interface MaestroSessionHandoffProps {
  /** Display name of the Maestro Buddy handed the child over to. */
  maestroName: string;
  /** The intent that opened the session (homework / study / quizMe). */
  intent: Intent;
  /** Localized subject label, when the child picked one. */
  subjectLabel?: string;
  /** Whether the input was pre-filled with a context message (UX-07). */
  hasContextMessage: boolean;
  /**
   * Generalist "a bit of everything" path: no concrete Maestro was chosen, so
   * `maestroName` carries the study coach's name and the banner greets AS the
   * coach (no "Prof.", no arbitrary host) to stay consistent with the coach
   * opener the child actually hears/reads.
   */
  generalist?: boolean;
}

/**
 * UX-01 + UX-07: child-first handoff banner.
 *
 * When the child arrives at a Maestro through an intent (not by hand from the
 * grown-ups grid), Buddy explains in plain words who they are now talking to —
 * WITHOUT masking the Maestro's identity (AI Act transparency, ADR 0064). When
 * the chat input is pre-filled with a context message (UX-07), the banner also
 * reassures the child that a question is already written for them, so the
 * pre-populated text is no longer a surprise.
 *
 * Dismissible, TTS-readable, and rendered above the first message so it never
 * steals focus or blocks the keyboard path.
 */
export function MaestroSessionHandoff({
  maestroName,
  intent,
  subjectLabel,
  hasContextMessage,
  generalist = false,
}: MaestroSessionHandoffProps) {
  const t = useTranslations('chat');
  const { speak, enabled: ttsEnabled } = useTTS();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const intentLabel = t(`intentHandoff.intent.${intent}`);
  const headline = generalist
    ? t('intentHandoff.headlineGeneralist', { name: maestroName })
    : subjectLabel
      ? t('intentHandoff.headlineSubject', { name: maestroName, subject: subjectLabel })
      : t('intentHandoff.headline', { name: maestroName, intent: intentLabel });
  const hint = hasContextMessage ? t('intentHandoff.contextHint') : null;

  const spokenText = [headline, hint].filter(Boolean).join('. ');

  return (
    <div
      data-testid="maestro-session-handoff"
      role="status"
      className="mx-auto mt-4 mb-2 w-full max-w-3xl rounded-2xl border border-accent-themed/30 bg-accent-themed/10 px-4 py-3 sm:px-5"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden="true">
          👋
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
            {headline}
          </p>
          {hint && <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{hint}</p>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {ttsEnabled && (
            <button
              type="button"
              data-testid="maestro-session-handoff-tts"
              onClick={() => speak(spokenText)}
              aria-label={t('intentHandoff.listen')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-accent-themed hover:bg-accent-themed/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed"
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            data-testid="maestro-session-handoff-dismiss"
            onClick={() => setDismissed(true)}
            aria-label={t('intentHandoff.dismiss')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-700/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
