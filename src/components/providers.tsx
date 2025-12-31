'use client';

import { useEffect, useRef } from 'react';
import { ThemeProvider } from 'next-themes';
import { AccessibilityProvider } from '@/components/accessibility';
import { ToastContainer } from '@/components/ui/toast';
import { IOSInstallBanner } from '@/components/pwa';
import {
  useSettingsStore,
  initializeStores,
  setupAutoSync,
} from '@/lib/stores/app-store';
import { initializeTelemetry } from '@/lib/telemetry';

// Debug logger - captures all browser errors to file (dev only)
import '@/lib/client-error-logger';

interface ProvidersProps {
  children: React.ReactNode;
}

// Component to apply accent color from settings
function AccentColorApplier() {
  const { appearance } = useSettingsStore();

  useEffect(() => {
    // Apply accent color to document root (default to 'blue' if not set)
    const accentColor = appearance?.accentColor || 'blue';
    document.documentElement.setAttribute('data-accent', accentColor);
  }, [appearance?.accentColor]);

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
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize stores from database
    initializeStores().catch(() => {
      // Silent fail - stores will use localStorage fallback
    });

    // Initialize telemetry
    const cleanupTelemetry = initializeTelemetry();

    // Setup auto-sync every 30 seconds
    const syncInterval = setupAutoSync(30000);

    // Sync on page unload
    const handleUnload = () => {
      const settings = useSettingsStore.getState();
      if (settings.pendingSync) {
        // Use sendBeacon for reliable sync on close
        navigator.sendBeacon('/api/user/settings', JSON.stringify({
          theme: settings.theme,
          language: settings.appearance.language,
          accentColor: settings.appearance.accentColor,
        }));
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(syncInterval);
      cleanupTelemetry();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // Fix #4: Explicitly map themes to class names so .light class is added
      value={{ light: 'light', dark: 'dark' }}
    >
      <AccessibilityProvider>
        <StoreInitializer />
        <AccentColorApplier />
        {children}
        <ToastContainer />
        <IOSInstallBanner />
      </AccessibilityProvider>
    </ThemeProvider>
  );
}
