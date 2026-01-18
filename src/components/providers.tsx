"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { AccessibilityProvider } from "@/components/accessibility";
import { ToastContainer } from "@/components/ui/toast";
import { IOSInstallBanner } from "@/components/pwa";
import { ParentAccessButton } from "@/components/navigation/parent-access-button";
import { CookieConsentWall } from "@/components/consent";
import { TosGateProvider } from "@/components/tos/tos-gate-provider";
import {
  useSettingsStore,
  initializeStores,
  setupAutoSync,
} from "@/lib/stores";
import { useConversationFlowStore } from "@/lib/stores/conversation-flow-store";
import { initializeTelemetry } from "@/lib/telemetry";
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

// Pages where parent access button should NOT appear
const EXCLUDED_PATHS = [
  "/", // Home page has its own button in sidebar
  "/landing",
  "/welcome",
];

function ConditionalParentAccess() {
  const pathname = usePathname();
  const shouldHide = EXCLUDED_PATHS.some((p) =>
    p === "/" ? pathname === "/" : pathname?.startsWith(p),
  );
  if (shouldHide) return null;
  return <ParentAccessButton />;
}

export function Providers({ children, nonce: _nonce }: ProvidersProps) {
  // Note: _nonce is passed through but not directly used in this component
  // Next.js automatically applies it to hydration scripts based on CSP header
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // Fix #4: Explicitly map themes to class names so .light class is added
      value={{ light: "light", dark: "dark" }}
    >
      <AccessibilityProvider>
        <CookieConsentWall>
          <TosGateProvider>
            <StoreInitializer />
            <AccentColorApplier />
            {children}
            <ToastContainer />
            <IOSInstallBanner />
            <ConditionalParentAccess />
          </TosGateProvider>
        </CookieConsentWall>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}
