'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  initializeConsent,
  retryConsentSync,
  saveAnalyticsConsent,
  saveTermsConsent,
  syncUnifiedConsentToServer,
} from '@/lib/consent/unified-consent-storage';
import { hasAcceptedTerms } from '@/lib/consent/unified-consent';
import { ConsentToggle } from './consent-toggle';
import { ConsentFeedback } from './consent-feedback';
import { ConsentPreferences } from './consent-preferences';
import { ConsentReanswer } from './consent-reanswer';
import { useConsentUI } from './use-consent-ui';

export function UnifiedConsentWall({ children }: { children: React.ReactNode }) {
  const t = useTranslations('consent.unified');
  const terms = useTranslations('consent.terms.modal');
  const { snapshot, consent, busy, failure, run, invalidPurposes } = useConsentUI();
  const [checked, setChecked] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const initialized = useRef(false);
  const loading = !snapshot.ready || snapshot.status === 'loading';
  // Current, already recorded terms stay usable while their account read resolves.
  const termsMet = hasAcceptedTerms(consent) && snapshot.error?.scope !== 'initialization';
  const open = !termsMet;

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void run(async () => {
      await initializeConsent();
    });
  }, [run]);

  const saveAnalytics = (value: boolean) => {
    void run(
      async () => {
        const intent = saveAnalyticsConsent(value);
        await syncUnifiedConsentToServer(intent);
      },
      'analytics',
      true,
    );
  };
  const acceptTerms = (explicitlyAccepted = checked) => {
    if (!explicitlyAccepted) return;
    void run(
      async () => {
        const intent = saveTermsConsent(true);
        await syncUnifiedConsentToServer(intent);
      },
      'terms',
      true,
    );
  };
  const retry = () => {
    void run(() => retryConsentSync());
  };

  return (
    <>
      {children}
      <Dialog open={open}>
        <DialogContent
          data-testid="consent-banner"
          showCloseButton={false}
          className="bottom-0 left-0 top-auto max-h-[90dvh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none p-4 sm:p-6"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            previousFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            title.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (previousFocus.current?.isConnected) previousFocus.current.focus();
          }}
        >
          <div className="mx-auto w-full max-w-4xl space-y-4">
            <DialogTitle ref={title} tabIndex={-1}>
              {loading ? t('loading') : t('titleWelcome')}
            </DialogTitle>
            <DialogDescription>
              {loading ? t('loading') : terms('warning.description')}
            </DialogDescription>
            <ConsentPreferences />
            {!loading && (
              <>
                <div className="flex flex-wrap gap-4 text-sm underline">
                  <Link href="/terms" target="_blank" rel="noopener">
                    {t('links.full')}
                  </Link>
                  <Link href="/privacy" target="_blank" rel="noopener">
                    {t('links.privacy')}
                  </Link>
                </div>
                {invalidPurposes.includes('terms') ? (
                  <ConsentReanswer purpose="terms" busy={busy} onSave={acceptTerms} />
                ) : (
                  <>
                    <label className="flex min-h-11 items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 shrink-0"
                        checked={checked}
                        disabled={busy || snapshot.pending.includes('terms')}
                        onChange={(event) => setChecked(event.target.checked)}
                        aria-label={t('tosCheckbox.label')}
                      />
                      <span>
                        {t('tosCheckbox.label')} {t('tosCheckbox.text')}
                      </span>
                    </label>
                    <Button
                      onClick={() => acceptTerms()}
                      disabled={!checked || busy || snapshot.pending.includes('terms')}
                      className="h-auto min-h-11 whitespace-normal"
                    >
                      {terms('buttons.accept')}
                    </Button>
                  </>
                )}
                <section aria-label={t('bannerTitle')} className="space-y-3 border-t pt-4">
                  <h3 className="font-semibold">{t('bannerTitle')}</h3>
                  <p className="text-sm">
                    {t('bannerDescription')}{' '}
                    <Link className="underline" href="/cookies" target="_blank" rel="noopener">
                      {t('links.cookies')}
                    </Link>
                    .
                  </p>
                  <p className="text-sm">{t('bannerRights')}</p>
                  {invalidPurposes.includes('analytics') ? (
                    <ConsentReanswer purpose="analytics" busy={busy} onSave={saveAnalytics} />
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-4">
                        <ConsentToggle label={t('categories.essential')} enabled locked />
                        <ConsentToggle
                          label={t('categories.analytics')}
                          enabled={consent?.cookies.analytics === true}
                          disabled={busy}
                          onChange={() => saveAnalytics(consent?.cookies.analytics !== true)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => saveAnalytics(false)}
                          className="h-auto min-h-11 whitespace-normal"
                        >
                          {t('buttons.rejectAll')}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onClick={() => saveAnalytics(true)}
                          className="h-auto min-h-11 whitespace-normal"
                        >
                          {t('buttons.acceptAll')}
                        </Button>
                      </div>
                    </>
                  )}
                </section>
              </>
            )}
            <ConsentFeedback
              snapshot={snapshot}
              busy={busy}
              failure={failure}
              retry={retry}
              requiresNewDecision={invalidPurposes.length > 0}
            />
          </div>
        </DialogContent>
      </Dialog>
      {!open &&
        (failure ||
          snapshot.error ||
          snapshot.pending.length > 0 ||
          invalidPurposes.length > 0) && (
          <aside
            aria-label={t('bannerTitle')}
            className="fixed bottom-2 right-2 z-40 max-h-[40dvh] max-w-[calc(100%-1rem)] overflow-y-auto rounded-lg border bg-white p-4 dark:bg-slate-900"
          >
            {invalidPurposes.includes('analytics') && (
              <ConsentReanswer purpose="analytics" busy={busy} onSave={saveAnalytics} />
            )}
            <ConsentFeedback
              snapshot={snapshot}
              busy={busy}
              failure={failure}
              retry={retry}
              requiresNewDecision={invalidPurposes.length > 0}
            />
          </aside>
        )}
    </>
  );
}

export default UnifiedConsentWall;
