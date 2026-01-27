"use client";

/**
 * A11y Instant Access
 * Container component combining the floating button and quick settings panel
 *
 * Note: This component requires i18n context (NextIntlClientProvider).
 * When rendered outside locale routes, it renders null to prevent errors.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { A11yFloatingButton } from "./a11y-floating-button";
import { A11yQuickPanel } from "./a11y-quick-panel";
import { locales } from "@/i18n/config";

/**
 * Check if the current pathname is within a locale route
 * (e.g., /it/chat, /en/home, etc.)
 */
function useIsInLocaleRoute(): boolean {
  const pathname = usePathname();
  if (!pathname) return false;

  // Check if pathname starts with a valid locale prefix
  // Using direct string comparison to avoid non-literal RegExp security warning
  return locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

export function A11yInstantAccess() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const isInLocaleRoute = useIsInLocaleRoute();

  const handleToggle = () => {
    setIsPanelOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsPanelOpen(false);
  };

  // Only render when i18n context is available (inside locale routes)
  if (!isInLocaleRoute) {
    return null;
  }

  return (
    <>
      <A11yFloatingButton onClick={handleToggle} isExpanded={isPanelOpen} />
      <A11yQuickPanel isOpen={isPanelOpen} onClose={handleClose} />
    </>
  );
}
