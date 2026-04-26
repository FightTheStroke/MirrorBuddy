'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveConsent, syncConsentToServer } from '@/lib/consent/consent-storage';
import {
  subscribeToConsent,
  getConsentSnapshot,
  getServerConsentSnapshot,
  updateConsentSnapshot,
} from '@/lib/consent/consent-store';
import { getCookieConsentConfigFromLocale, type CookieConsentConfig } from '@/lib/compliance';
import { CookiePreferencesModal } from './cookie-preferences-modal';

interface CookieConsentWallProps {
  children: React.ReactNode;
}

/**
 * Cookie Consent Banner - GDPR Compliant (non-blocking)
 *
 * Shows a bottom banner for cookie consent instead of blocking the page.
 * Essential cookies are always on. User can accept all, reject optional,
 * or customize preferences.
 *
 * Implements country-specific requirements:
 * - Spain (LOPDGDD): "Rechazar Todo" prominent
 * - France (Law 78-17): "Tout Refuser" prominent
 * - Germany (TTDSG): "Alle Ablehnen" prominent
 * - UK (UK GDPR): "Reject All" prominent
 * - Italy (GDPR): "Rifiuta Tutto" prominent
 */
export function CookieConsentWall({ children }: CookieConsentWallProps) {
  const t = useTranslations('consent.cookie');
  const locale = useLocale();

  const config: CookieConsentConfig = getCookieConsentConfigFromLocale(locale);

  const consented = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const handleAcceptAll = async () => {
    const consent = saveConsent(true);
    await syncConsentToServer(consent);
    updateConsentSnapshot(true);
  };

  const handleRejectAll = async () => {
    const consent = saveConsent(false);
    await syncConsentToServer(consent);
    updateConsentSnapshot(true);
  };

  return (
    <>
      {children}

      {!consented && (
        <div
          role="dialog"
          aria-label={config.titleText}
          className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300"
        >
          <div className="mx-auto max-w-4xl p-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="hidden sm:flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Cookie className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {config.titleText}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {t('explanation')}{' '}
                      <Link href="/privacy" className="text-blue-600 underline dark:text-blue-400">
                        {t('privacyPolicy')}
                      </Link>
                      {' · '}
                      <Link href="/cookies" className="text-blue-600 underline dark:text-blue-400">
                        {t('cookiePolicy')}
                      </Link>
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={handleRejectAll}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {config.rejectAllText}
                    </Button>
                    <button
                      onClick={() => setShowCustomizeModal(true)}
                      className="px-3 py-1.5 text-xs text-blue-600 hover:underline dark:text-blue-400"
                      type="button"
                    >
                      {config.customizeText}
                    </button>
                    <Button onClick={handleAcceptAll} size="sm" className="text-xs">
                      {config.acceptAllText}
                    </Button>
                  </div>

                  {/* Regulatory note */}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {t('coppa')} · {config.regulation}
                  </p>
                </div>

                {/* Close (accept essential only) */}
                <button
                  onClick={handleRejectAll}
                  aria-label={config.rejectAllText}
                  className="flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Customize Modal */}
          <CookiePreferencesModal
            open={showCustomizeModal}
            onOpenChange={setShowCustomizeModal}
            analyticsEnabled={analyticsEnabled}
            onAnalyticsEnabledChange={setAnalyticsEnabled}
          />
        </div>
      )}
    </>
  );
}

export default CookieConsentWall;
