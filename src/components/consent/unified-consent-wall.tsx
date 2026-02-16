'use client';

import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { clientLogger } from '@/lib/logger/client';
import { ConsentToggle } from './consent-toggle';
import {
  saveUnifiedConsent,
  syncUnifiedConsentToServer,
  needsReconsent,
  initializeConsent,
  markConsentLoaded,
} from '@/lib/consent/unified-consent-storage';
import {
  subscribeToConsent,
  getConsentSnapshot,
  getServerConsentSnapshot,
  updateConsentSnapshot,
} from '@/lib/consent/consent-store';

interface UnifiedConsentWallProps {
  children: React.ReactNode;
}

/**
 * Unified Consent Wall - Prominent Bottom Banner (GDPR/COPPA)
 *
 * Large, always-visible banner until user accepts or rejects.
 * Cookie categories with toggles, "Reject All" / "Accept All" buttons.
 * Compliant with EU GDPR, Italian Garante, CNIL, TTDSG, ICO guidelines.
 */
export function UnifiedConsentWall({ children }: UnifiedConsentWallProps) {
  const t = useTranslations('consent.unified');

  const consented = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );

  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  const isReconsent = needsReconsent();

  useEffect(() => {
    let mounted = true;
    const loadConsent = async () => {
      try {
        const hasConsent = await initializeConsent();
        if (mounted) {
          updateConsentSnapshot(hasConsent);
          markConsentLoaded();
          setIsLoading(false);
          if (!hasConsent || isReconsent) setIsVisible(true);
        }
      } catch (error) {
        clientLogger.error(
          'Failed to initialize consent',
          { component: 'UnifiedConsentWall' },
          error,
        );
        if (mounted) {
          setIsLoading(false);
          setIsVisible(true);
        }
      }
    };
    loadConsent();
    return () => {
      mounted = false;
    };
  }, [isReconsent]);

  const saveConsent = useCallback(async (analytics: boolean) => {
    setIsSubmitting(true);
    try {
      const consent = saveUnifiedConsent(analytics);
      await syncUnifiedConsentToServer(consent);
      updateConsentSnapshot(true);
      setIsVisible(false);
    } catch (error) {
      clientLogger.error('Failed to save consent', { component: 'UnifiedConsentWall' }, error);
      updateConsentSnapshot(true);
      setIsVisible(false);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleAcceptAll = useCallback(() => saveConsent(true), [saveConsent]);
  const handleRejectAll = useCallback(() => saveConsent(false), [saveConsent]);

  if (consented && !isReconsent) return <>{children}</>;

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
      {children}
      {(isLoading || isVisible) && (
        <>
          {/* Backdrop overlay */}
          <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" />
          {/* Banner */}
          <div
            data-testid="consent-banner"
            className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900
              border-t border-slate-200 dark:border-slate-700
              shadow-2xl transition-transform duration-500
              ${prefersReducedMotion ? '' : 'ease-out'}
              ${isLoading ? 'translate-y-0 opacity-60' : isVisible ? 'translate-y-0' : 'translate-y-full'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-banner-title"
            aria-describedby="consent-banner-desc"
          >
            <div className="max-w-4xl mx-auto px-6 py-6 sm:py-8">
              {isLoading ? (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t('loading')}</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Title */}
                  <h2
                    id="consent-banner-title"
                    className="text-lg font-bold text-slate-900 dark:text-white"
                  >
                    {isReconsent ? t('titleUpdated') : t('bannerTitle')}
                  </h2>

                  {/* Description */}
                  <p
                    id="consent-banner-desc"
                    className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                  >
                    {t('bannerDescription')}{' '}
                    <Link
                      href="/cookies"
                      target="_blank"
                      rel="noopener"
                      className="text-blue-600 dark:text-blue-400 underline hover:no-underline font-medium"
                    >
                      {t('links.cookies')}
                    </Link>
                    .
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t('bannerRights')}</p>

                  {/* Cookie category toggles */}
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                    <ConsentToggle
                      label={t('categories.essential')}
                      enabled={true}
                      locked
                      disabled={isSubmitting}
                    />
                    <ConsentToggle
                      label={t('categories.analytics')}
                      enabled={analyticsEnabled}
                      onChange={() => setAnalyticsEnabled(!analyticsEnabled)}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <Link
                      href="/cookies"
                      target="_blank"
                      rel="noopener"
                      className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300
                        bg-slate-100 dark:bg-slate-800 rounded-full
                        hover:bg-slate-200 dark:hover:bg-slate-700
                        transition-colors text-center"
                    >
                      {t('buttons.learnMore')}
                    </Link>
                    <div className="flex-1" />
                    <button
                      onClick={handleRejectAll}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 text-sm font-semibold text-white
                        bg-blue-600 hover:bg-blue-700 rounded-full
                        transition-colors disabled:opacity-50 text-center"
                    >
                      {t('buttons.rejectAll')}
                    </button>
                    <button
                      onClick={handleAcceptAll}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 text-sm font-semibold text-white
                        bg-blue-600 hover:bg-blue-700 rounded-full
                        transition-colors disabled:opacity-50 text-center"
                    >
                      {t('buttons.acceptAll')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
              {isSubmitting && t('screenReader.submitting')}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default UnifiedConsentWall;
