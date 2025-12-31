'use client';

import { useState, useEffect } from 'react';
import { X, Share, Plus } from 'lucide-react';
import { isIOSSafariBrowser } from '@/lib/push/vapid';

const BANNER_DISMISSED_KEY = 'ios-install-banner-dismissed';
const DISMISS_DURATION_DAYS = 7;

interface IOSInstallBannerProps {
  /** Force show banner even if dismissed (for testing) */
  forceShow?: boolean;
  /** Called when user dismisses the banner */
  onDismiss?: () => void;
}

/**
 * iOS PWA Install Banner (ADR-0014)
 *
 * Shows instructions for iOS Safari users to install the app as PWA.
 * Required for push notifications on iOS.
 *
 * Features:
 * - Auto-detects iOS Safari (not Chrome/Firefox on iOS, not PWA mode)
 * - Dismissable with 7-day remember period
 * - Clear step-by-step instructions
 */
export function IOSInstallBanner({ forceShow = false, onDismiss }: IOSInstallBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on iOS Safari (not installed as PWA)
    if (!isIOSSafariBrowser() && !forceShow) {
      return;
    }

    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissedAt && !forceShow) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismiss = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < DISMISS_DURATION_DAYS) {
        return;
      }
    }

    // Show banner after short delay for better UX
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [forceShow]);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, new Date().toISOString());
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-inset-bottom">
      <div className="max-w-md mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl overflow-hidden">
        {/* Header with dismiss */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-white font-semibold">Installa ConvergioEdu</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <p className="text-white/90 text-sm mb-4">
            Installa l&apos;app per ricevere notifiche e usarla offline.
          </p>

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Tocca</span>
                <Share className="w-5 h-5 text-white" />
                <span className="text-white text-sm">in basso</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">2</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Seleziona &quot;Aggiungi alla schermata Home&quot;</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">3</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Tocca &quot;Aggiungi&quot;</span>
              </div>
            </div>
          </div>

          {/* Why install */}
          <p className="text-white/70 text-xs mt-4 text-center">
            Dopo l&apos;installazione potrai attivare le notifiche push
          </p>
        </div>
      </div>
    </div>
  );
}
