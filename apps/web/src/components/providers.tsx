'use client';

import { useEffect } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { AccessibilityProvider, MotionConfigBridge } from '@/components/accessibility';
import { DocumentLocaleSync } from '@/components/i18n/document-locale-sync';
import { StagingBanner } from '@/components/ui/staging-banner';
import { MaintenanceBanner } from '@/components/ui/maintenance-banner';
import { ToastContainer } from '@/components/ui/toast';
import { IOSInstallBanner } from '@/components/pwa';
import { ConditionalUnifiedConsent } from '@/components/consent';
import { useSettingsStore, initializeStores, setupAutoSync } from '@/lib/stores';
import { useConversationFlowStore } from '@/lib/stores/conversation-flow-store';
import { initializeTelemetry } from '@/lib/telemetry';
import { ActivityTracker } from '@/lib/telemetry/use-activity-tracker';
import { migrateSessionStorageKey } from '@/lib/storage/migrate-session-key';
import { registerOfflineServiceWorker } from '@/lib/pwa/offline-sw-registration';
import { resolveAccessibleAccentColor } from '@/lib/accessibility/accent-contrast';
import { IdentityProvider, useClientIdentity } from '@/lib/auth/identity-provider';
import type { ClientIdentity } from '@/lib/auth/identity-types';
import { getClientIdentity } from '@/lib/auth/client-auth';
import { logger } from '@/lib/logger';
import { IdentityNotice } from '@/components/ui/identity-notice';

// Debug logger - captures all browser errors to file (dev only)
import '@/lib/client-error-logger';
// Keeps Zod from probing `Function("")`, which our CSP blocks and reports
import '@/lib/validation/zod-csp-config';

interface ProvidersProps {
  children: React.ReactNode;
  initialIdentity?: ClientIdentity;
  /**
   * CSP nonce for inline scripts
   * Next.js automatically uses this for hydration scripts
   */
  nonce?: string;
}

// Component to apply accent color from settings
function AccentColorApplier() {
  const { appearance } = useSettingsStore();
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    // Apply accent color to document root (default to 'blue' if not set)
    const accentColor = appearance?.accentColor || 'blue';
    const isDarkTheme = resolvedTheme === 'dark' || theme === 'dark';
    const resolvedAccent = resolveAccessibleAccentColor(accentColor, isDarkTheme);
    document.documentElement.setAttribute('data-accent', accentColor);

    if (resolvedAccent.kind === 'custom') {
      document.documentElement.style.setProperty('--accent-color', resolvedAccent.foreground);
      document.documentElement.style.setProperty('--accent-bg-color', resolvedAccent.background);
      return;
    }

    document.documentElement.style.removeProperty('--accent-color');
    document.documentElement.style.removeProperty('--accent-bg-color');
  }, [appearance?.accentColor, resolvedTheme, theme]);

  // Set default on mount before store hydrates
  useEffect(() => {
    if (!document.documentElement.hasAttribute('data-accent')) {
      document.documentElement.setAttribute('data-accent', 'blue');
    }
  }, []);

  return null;
}

// Component to initialize stores and sync with database
function StoreInitializer() {
  const identity = useClientIdentity();

  useEffect(() => {
    // Migrate old session key (convergio → mirrorbuddy) for existing users
    migrateSessionStorageKey();

    registerOfflineServiceWorker().catch(() => {
      logger.warn('Offline service worker registration failed');
    });
    return initializeTelemetry();
  }, []);

  useEffect(() => {
    if (identity.status !== 'authenticated') return;
    let active = true;
    let hydrated = false;
    let syncInterval: ReturnType<typeof setupAutoSync> | undefined;
    // Initialize stores from database
    initializeStores()
      .then(() => {
        if (!active || getClientIdentity() !== identity) return;
        hydrated = true;
        syncInterval = setupAutoSync(30000);
      })
      .catch(() => {
        logger.warn('Store hydration failed; retry when identity is refreshed');
      });

    // Load conversation summaries for context
    useConversationFlowStore
      .getState()
      .loadFromServer()
      .catch(() => {
        logger.warn('Conversation hydration failed; existing state retained');
      });

    // Sync on page unload
    const handleUnload = () => {
      if (!hydrated || getClientIdentity() !== identity) return;
      const settings = useSettingsStore.getState();
      if (settings.pendingSync) {
        // Use sendBeacon for reliable sync on close (Blob ensures application/json content-type)
        navigator.sendBeacon(
          '/api/user/settings',
          new Blob(
            [
              JSON.stringify({
                theme: settings.theme,
                language: settings.appearance.language,
                accentColor: settings.appearance.accentColor,
              }),
            ],
            { type: 'application/json' },
          ),
        );
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      active = false;
      if (syncInterval !== undefined) clearInterval(syncInterval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [identity]);

  return null;
}

export function Providers({ children, nonce, initialIdentity }: ProvidersProps) {
  return (
    <IdentityProvider initialIdentity={initialIdentity}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        // Fix #4: Explicitly map themes to class names so .light class is added
        value={{ light: 'light', dark: 'dark' }}
        // CSP nonce for inline theme script (prevents flash of unstyled content)
        nonce={nonce}
      >
        {/* Keeps <html lang> aligned with the locale route across soft navigation (R4) */}
        <DocumentLocaleSync />
        <AccessibilityProvider>
          {/* Bridge prefers-reduced-motion + a11y profile flag into framer-motion (A11Y-01) */}
          <MotionConfigBridge>
            {/* A11yInstantAccess moved to [locale]/layout.tsx for i18n context */}
            <StagingBanner />
            <MaintenanceBanner />
            <IdentityNotice />
            <ConditionalUnifiedConsent>
              <StoreInitializer />
              <AccentColorApplier />
              <ActivityTracker />
              {children}
              <ToastContainer />
              <IOSInstallBanner />
            </ConditionalUnifiedConsent>
          </MotionConfigBridge>
        </AccessibilityProvider>
      </ThemeProvider>
    </IdentityProvider>
  );
}
