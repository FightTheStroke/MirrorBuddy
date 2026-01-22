"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTrialStatus } from "@/lib/hooks/use-trial-status";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { MaestriSelectionModal } from "./maestri-selection-modal";

const STORAGE_KEY = "mirrorbuddy-maestri-selected";

/**
 * Check if maestri selection should be shown.
 * Returns true only for trial users who haven't completed selection.
 */
function shouldShowSelection(
  isTrialMode: boolean,
  isLoading: boolean,
  hasCompletedOnboarding: boolean,
  isOnboardingHydrated: boolean,
  pathname: string,
): boolean {
  // Wait for trial status to load
  if (isLoading || !isOnboardingHydrated) return false;

  // Only show for trial users
  if (!isTrialMode) return false;

  // Only show after onboarding is completed
  if (!hasCompletedOnboarding) return false;

  // Only show on home page (not on welcome or other pages)
  if (pathname !== "/") return false;

  // Check if already completed
  const completed =
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (completed === "true") return false;

  return true;
}

/**
 * Maestri Selection Provider
 *
 * Shows maestri selection modal for trial users AFTER onboarding completion.
 * Only appears on home page, not during welcome flow.
 * Checks localStorage flag to avoid showing again.
 */
export function MaestriSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isTrialMode, isLoading } = useTrialStatus();
  const { hasCompletedOnboarding, isHydrated } = useOnboardingStore();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  const showModal =
    shouldShowSelection(
      isTrialMode,
      isLoading,
      hasCompletedOnboarding,
      isHydrated,
      pathname,
    ) && !dismissed;

  const handleComplete = () => {
    setDismissed(true);
  };

  return (
    <>
      {children}
      <MaestriSelectionModal isOpen={showModal} onComplete={handleComplete} />
    </>
  );
}

export default MaestriSelectionProvider;
