"use client";

import { useState } from "react";
import { isStaging } from "@/lib/environment/staging-detector";
import { useTranslations } from "next-intl";

/**
 * StagingBanner component displays a warning banner when running in staging environment.
 *
 * Features:
 * - Shows only when isStaging() returns true
 * - Yellow/amber background for high visibility
 * - Fixed positioning at viewport top
 * - Dismissible with sessionStorage persistence
 * - Accessible with proper ARIA labels and contrast
 *
 * @example
 * ```tsx
 * <StagingBanner />
 * ```
 */
function shouldShowStagingBanner(): boolean {
  // Check if previously dismissed in this session
  const wasDismissed =
    typeof window !== "undefined" &&
    sessionStorage.getItem("staging-banner-dismissed") === "true";
  // Only show if staging AND not dismissed
  return isStaging() && !wasDismissed;
}

export function StagingBanner() {
  const t = useTranslations("common");
  const [showBanner, setShowBanner] = useState(() => shouldShowStagingBanner());

  if (!showBanner) return null;

  const handleDismiss = () => {
    // Persist dismissal in sessionStorage
    sessionStorage.setItem("staging-banner-dismissed", "true");
    setShowBanner(false);
  };

  return (
    <div
      role="banner"
      aria-label={t("stagingEnvironmentIndicator")}
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2"
    >
      <span>{t("stagingEnvironmentDataWillBeMarkedAsTestData")}</span>
      <button
        onClick={handleDismiss}
        aria-label={t("dismissStagingBanner")}
        className="ml-4 px-2 py-0.5 bg-amber-600 hover:bg-amber-700 rounded text-xs text-amber-950 font-semibold transition-colors"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}
