"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { AccessibilityProvider } from "@/components/accessibility";
import { StagingBanner } from "@/components/ui/staging-banner";
import { ToastContainer } from "@/components/ui/toast";
import { IOSInstallBanner } from "@/components/pwa";
import { UnifiedConsentWall } from "@/components/consent";
import {
  useSettingsStore,
  initializeStores,
  setupAutoSync,
} from "@/lib/stores";
import { useConversationFlowStore } from "@/lib/stores/conversation-flow-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { initializeTelemetry } from "@/lib/telemetry";
import { ActivityTracker } from "@/lib/telemetry/use-activity-tracker";
import { migrateSessionStorageKey } from "@/lib/storage/migrate-session-key";

// Debug logger - captures all browser errors to file (dev only)
import "@/lib/client-error-logger";

interface ProvidersProps {
  children: React.ReactNode;
  /**
   * CSP nonce for inline scripts
   * Next.js automatically uses this for hydration scripts
   */
  nonce?: string;
}

// Component to apply accent color from settings
function AccentColorApplier() {
  const { appearance } = useSettingsStore();

  useEffect(() => {
    // Apply accent color to document root (default to 'blue' if not set)
    const accentColor = appearance?.accentColor || "blue";
    document.documentElement.setAttribute("data-accent", accentColor);
  }, [appearance?.accentColor]);

  // Set default on mount before store hydrates
  useEffect(() => {
    if (!document.documentElement.hasAttribute("data-accent")) {
      document.documentElement.setAttribute("data-accent", "blue");
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

    // Migrate old session key (convergio → mirrorbuddy) for existing users
    migrateSessionStorageKey();

    // Initialize stores from database
    initializeStores().catch(() => {
      // Silent fail - stores will use in-memory defaults
    });

    // Load conversation summaries for context
    useConversationFlowStore
      .getState()
      .loadFromServer()
      .catch(() => {
        // Silent fail - conversations will start fresh
      });

    // Initialize telemetry
    const cleanupTelemetry = initializeTelemetry();

    // Setup auto-sync every 30 seconds
    const syncInterval = setupAutoSync(30000);

    // Sync on page unload
    const handleUnload = () => {
      const settings = useSettingsStore.getState();
      if (settings.pendingSync) {
        // Use sendBeacon for reliable sync on close (Blob ensures application/json content-type)
        navigator.sendBeacon(
          "/api/user/settings",
          new Blob(
            [
              JSON.stringify({
                theme: settings.theme,
                language: settings.appearance.language,
                accentColor: settings.appearance.accentColor,
              }),
            ],
            { type: "application/json" },
          ),
        );
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(syncInterval);
      cleanupTelemetry();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  return null;
}

// Pages where unified consent wall should be skipped
// Legal pages MUST be accessible without accepting cookies (GDPR requirement)
const PUBLIC_PATHS = [
  "/welcome",
  "/landing",
  "/privacy",
  "/cookies",
  "/terms",
  "/ai-transparency",
  "/legal/data-request",
];

/**
 * Conditional Unified Consent - DB-first TOS + Cookie consent
 * Skips blocking wall on:
 * - Public/legal pages (GDPR requirement)
 * - Before onboarding is completed (so user can see landing/welcome)
 * Shows wall only when user has completed onboarding and is using the app
 */
function ConditionalUnifiedConsent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasCompletedOnboarding } = useOnboardingStore();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

  // On public/legal pages, skip blocking wall (users must access legal docs)
  if (isPublicPath) {
    return <>{children}</>;
  }

  // If onboarding not completed, skip consent wall (let onboarding redirect happen)
  if (!hasCompletedOnboarding) {
    return <>{children}</>;
  }

  // User has completed onboarding and is using the app - show consent wall
  return <UnifiedConsentWall>{children}</UnifiedConsentWall>;
}

export function Providers({ children, nonce }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // Fix #4: Explicitly map themes to class names so .light class is added
      value={{ light: "light", dark: "dark" }}
      // CSP nonce for inline theme script (prevents flash of unstyled content)
      nonce={nonce}
    >
      <AccessibilityProvider>
        {/* A11yInstantAccess moved to [locale]/layout.tsx for i18n context */}
        <StagingBanner />
        <ConditionalUnifiedConsent>
          <StoreInitializer />
          <AccentColorApplier />
          <ActivityTracker />
          {children}
          <ToastContainer />
          <IOSInstallBanner />
        </ConditionalUnifiedConsent>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}
