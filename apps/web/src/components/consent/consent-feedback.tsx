'use client';

import { useTranslations } from 'next-intl';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  ConsentSyncError,
  type ConsentPurpose,
  type ConsentSyncSnapshot,
} from '@/lib/consent/unified-consent';

function ConsentReloadLink() {
  const t = useTranslations('consent.sync');
  return (
    <a
      href={typeof window === 'undefined' ? '' : window.location.href.split('#')[0]}
      className={buttonVariants({ variant: 'outline' })}
    >
      {t('reload')}
    </a>
  );
}

interface ConsentFeedbackProps {
  snapshot: ConsentSyncSnapshot;
  failure?: unknown;
  busy: boolean;
  retry: () => void;
  purpose?: ConsentPurpose;
  requiresNewDecision?: boolean;
}

export function ConsentFeedback({
  snapshot,
  failure,
  busy,
  retry,
  purpose,
  requiresNewDecision = false,
}: ConsentFeedbackProps) {
  const t = useTranslations('consent.sync');
  const scopedError =
    !purpose ||
    !snapshot.error?.scope ||
    snapshot.error.scope === purpose ||
    snapshot.error.scope === 'initialization';
  const error = failure || (scopedError ? snapshot.error : null);
  const pending = snapshot.pending.some((item) => !purpose || item === purpose);
  const retryable =
    failure instanceof ConsentSyncError ? failure.retryable : snapshot.error?.retryable !== false;
  if (busy) return <p role="status">{t('saving')}</p>;
  if (!error && !pending && !requiresNewDecision) return null;
  return (
    <div className="space-y-2 text-sm">
      <p
        role={error || requiresNewDecision ? 'alert' : 'status'}
        className="text-slate-800 dark:text-slate-100"
      >
        {requiresNewDecision
          ? t('changed')
          : error
            ? t(retryable ? 'failed' : 'cannotRetry')
            : t('pending')}
      </p>
      {retryable && !requiresNewDecision && (
        <Button type="button" variant="outline" onClick={retry}>
          {t('retry')}
        </Button>
      )}
      {!retryable && !requiresNewDecision && <ConsentReloadLink />}
    </div>
  );
}

export function ConsentCompletionFeedback({
  kind,
  failed,
  busy,
  retry,
}: {
  kind: 'trial' | 'reload';
  failed: boolean;
  busy: boolean;
  retry?: () => void;
}) {
  const t = useTranslations('consent.sync');
  if (!failed && !busy) return null;
  return (
    <div className="space-y-2 text-sm">
      <p role={busy ? 'status' : 'alert'}>
        {t(
          busy
            ? kind === 'trial'
              ? 'startingTrial'
              : 'reloading'
            : kind === 'trial'
              ? 'trialStartFailed'
              : 'reloadFailed',
        )}
      </p>
      {!busy &&
        (retry ? (
          <Button type="button" variant="outline" onClick={retry}>
            {t('retryTrial')}
          </Button>
        ) : (
          <ConsentReloadLink />
        ))}
    </div>
  );
}
