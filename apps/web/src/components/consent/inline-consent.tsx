'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  retryConsentSync,
  saveAnalyticsConsent,
  syncUnifiedConsentToServer,
} from '@/lib/consent/unified-consent-storage';
import { ConsentFeedback } from './consent-feedback';
import { ConsentReanswer } from './consent-reanswer';
import { useConsentUI } from './use-consent-ui';

interface InlineConsentProps {
  /** Reports a recorded choice, never permission to collect analytics. */
  onConsentChange?: (consented: boolean) => void;
  compact?: boolean;
}

export function InlineConsent({ onConsentChange, compact = false }: InlineConsentProps) {
  const t = useTranslations('consent.inline');
  const { snapshot, consent, busy, failure, run, invalidPurposes } = useConsentUI();
  const reanswer = invalidPurposes.includes('analytics');
  const [choice, setChoice] = useState<boolean | null>(null);
  const id = useId();
  const analytics = choice ?? consent?.cookies.analytics ?? false;
  const save = (accepted: boolean) => {
    setChoice(accepted);
    void run(
      async () => {
        const intent = saveAnalyticsConsent(accepted);
        await syncUnifiedConsentToServer(intent);
        onConsentChange?.(true);
      },
      'analytics',
      true,
    );
  };
  const retry = () => {
    void run(async () => {
      await retryConsentSync('analytics');
      onConsentChange?.(true);
    }, 'analytics');
  };
  return (
    <div
      className={
        compact ? 'space-y-3' : 'space-y-3 rounded-lg border bg-slate-50 p-4 dark:bg-slate-800'
      }
    >
      <p className="text-sm font-medium">{t('title')}</p>
      {!compact && <p className="text-sm">{t('description')}</p>}
      {reanswer ? (
        <ConsentReanswer purpose="analytics" busy={busy} onSave={save} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={id} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              id={id}
              type="checkbox"
              checked={analytics}
              disabled={busy}
              onChange={(event) => setChoice(event.target.checked)}
              className="h-5 w-5 shrink-0"
            />
            {t('analyticsLabel')}
          </label>
          <button
            type="button"
            onClick={() => save(analytics)}
            disabled={busy}
            className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {t('submitButton')}
          </button>
          <Link href="/cookies" className="text-sm underline">
            {t('learnMore')}
          </Link>
        </div>
      )}
      <ConsentFeedback
        snapshot={snapshot}
        busy={busy}
        failure={failure}
        retry={retry}
        purpose="analytics"
        requiresNewDecision={reanswer}
      />
      {!failure &&
        !snapshot.error &&
        !snapshot.pending.includes('analytics') &&
        snapshot.confirmations.analytics && (
          <p role="status" className="text-sm">
            {t('acceptedText')}
          </p>
        )}
    </div>
  );
}

export default InlineConsent;
