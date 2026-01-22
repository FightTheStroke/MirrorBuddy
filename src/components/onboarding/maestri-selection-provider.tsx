"use client";

import { useState } from "react";
import { useTrialStatus } from "@/lib/hooks/use-trial-status";
import { MaestriSelectionModal } from "./maestri-selection-modal";

const STORAGE_KEY = "mirrorbuddy-maestri-selected";

/**
 * Check if maestri selection should be shown.
 * Returns true only for trial users who haven't completed selection.
 */
function shouldShowSelection(
  isTrialMode: boolean,
  isLoading: boolean,
): boolean {
  // Wait for trial status to load
  if (isLoading) return false;

  // Only show for trial users
  if (!isTrialMode) return false;

  // Check if already completed
  const completed =
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (completed === "true") return false;

  return true;
}

/**
 * Maestri Selection Provider
 *
 * Shows maestri selection modal for trial users on first visit.
 * Checks localStorage flag to avoid showing again.
 */
export function MaestriSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isTrialMode, isLoading } = useTrialStatus();
  const [dismissed, setDismissed] = useState(false);

  const showModal = shouldShowSelection(isTrialMode, isLoading) && !dismissed;

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
