'use client';

import { useLocale, useTranslations } from 'next-intl';
import { BarChart3, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConsentToggle } from '@/components/consent/consent-toggle';
import { ConsentCompletionFeedback, ConsentFeedback } from '@/components/consent/consent-feedback';
import { ConsentReanswer } from '@/components/consent/consent-reanswer';
import { useConsentUI } from '@/components/consent/use-consent-ui';
import {
  clearUnifiedConsent,
  retryConsentSync,
  saveAnalyticsConsent,
  syncUnifiedConsentToServer,
} from '@/lib/consent/unified-consent-storage';
import { hasAcceptedTerms, isConsentTimestamp } from '@/lib/consent/unified-consent';

export function PrivacyConsentSettings() {
  const t = useTranslations('settings.privacy');
  const status = useTranslations('consent.sync');
  const locale = useLocale();
  const {
    snapshot,
    consent,
    busy,
    failure,
    run,
    analyticsAllowed,
    invalidPurposes,
    completing,
    completionFailure,
    runCompletion,
  } = useConsentUI();
  const reanswer = invalidPurposes.includes('analytics');
  const analytics = !reanswer && consent?.cookies.analytics === true;
  const date = (value: unknown) =>
    isConsentTimestamp(value)
      ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(value))
      : status('dateUnavailable');
  const save = (accepted: boolean) => {
    void run(
      async () => {
        const intent = saveAnalyticsConsent(accepted);
        await syncUnifiedConsentToServer(intent);
      },
      'analytics',
      true,
    );
  };
  const review = async () => {
    if (await run(clearUnifiedConsent)) {
      await runCompletion(() => window.location.reload());
    }
  };
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText aria-hidden className="h-5 w-5" />
            {t('consensiETermini')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="space-y-2 rounded-lg border p-3">
            <h3 className="font-medium">{t('terminiDiServizio')}</h3>
            <p>{hasAcceptedTerms(consent) ? status('termsAccepted') : status('termsRequired')}</p>
            {consent?.tos.accepted !== null && consent && (
              <p className="text-sm">
                {status('decisionDate')} {date(consent.tos.acceptedAt)}
              </p>
            )}
            {consent?.tos.version && (
              <p className="text-sm">
                {t('versione1')} {consent.tos.version}
              </p>
            )}
          </section>
          <section className="space-y-2 rounded-lg border p-3">
            <h3 className="font-medium">{t('cookieEPrivacy')}</h3>
            <p>
              {status(
                reanswer || consent?.cookies.analytics == null
                  ? 'unanswered'
                  : analytics
                    ? 'optedIn'
                    : 'refused',
              )}
            </p>
            {!reanswer && consent?.cookies.analytics != null && (
              <p className="text-sm">
                {status('decisionDate')} {date(consent.cookies.acceptedAt)}
              </p>
            )}
          </section>
          <Button
            variant="outline"
            className="h-auto min-h-11 w-full whitespace-normal"
            onClick={review}
            disabled={busy || completing}
          >
            {t('reviewAndModifyConsents')}
          </Button>
          <ConsentCompletionFeedback
            kind="reload"
            busy={completing}
            failed={completionFailure !== null}
          />
        </CardContent>
      </Card>
      <Card role="region" aria-label={t('telemetriaEAnalisi')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 aria-hidden className="h-5 w-5" />
            {t('telemetriaEAnalisi')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{status('analyticsDescription')}</p>
          {reanswer ? (
            <ConsentReanswer purpose="analytics" busy={busy} onSave={save} />
          ) : (
            <ConsentToggle
              label={t('toggleAnalytics')}
              enabled={analytics}
              onChange={() => save(!analytics)}
              disabled={busy}
            />
          )}
          {!analyticsAllowed && <p className="text-sm">{status('collectionOff')}</p>}
          {snapshot.confirmations.analytics &&
            !snapshot.pending.includes('analytics') &&
            !snapshot.error &&
            !failure && (
              <p role="status" className="text-sm">
                {status(
                  snapshot.confirmations.analytics === 'persisted' ? 'persisted' : 'received',
                )}
              </p>
            )}
          <ConsentFeedback
            snapshot={snapshot}
            busy={busy}
            failure={failure}
            requiresNewDecision={reanswer}
            retry={() => {
              void run(() => retryConsentSync('analytics'), 'analytics');
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
