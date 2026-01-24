"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TierName, FeatureKey } from "@/types/tier-types";
import { TierBadge } from "./TierBadge";
import { Button } from "@/components/ui/button";

interface LockedFeatureOverlayProps {
  /**
   * The current user's subscription tier
   */
  tier: TierName;

  /**
   * The feature being protected
   */
  feature: FeatureKey;

  /**
   * The locked feature content
   */
  children: React.ReactNode;

  /**
   * Optional callback when user clicks upgrade
   */
  onUpgrade?: () => void;

  /**
   * Optional CSS class for the wrapper
   */
  className?: string;
}

/**
 * LockedFeatureOverlay - Visual indicator for tier-locked features
 *
 * Wraps Pro-only features with a semi-transparent overlay when the current user
 * is not on the Pro tier. Shows lock icon, Pro badge, and upgrade prompt.
 *
 * Features:
 * - Transparent overlay for locked features
 * - Lock icon and Pro badge display
 * - Upgrade button/link
 * - Preserves children layout when unlocked
 * - Full accessibility support
 * - Keyboard navigable
 *
 * @example
 * <LockedFeatureOverlay tier="trial" feature="webcam">
 *   <WebcamComponent />
 * </LockedFeatureOverlay>
 */
export function LockedFeatureOverlay({
  tier,
  _feature,
  children,
  onUpgrade,
  className,
}: LockedFeatureOverlayProps) {
  // Only show overlay for non-pro tiers
  const isLocked = tier !== "pro";

  if (!isLocked) {
    return <>{children}</>;
  }

  const handleUpgradeClick = () => {
    onUpgrade?.();
  };

  return (
    <div
      data-testid="locked-overlay-wrapper"
      className={cn("relative inline-block w-full", className)}
    >
      {/* Render the locked content below */}
      <div className="opacity-50 pointer-events-none">{children}</div>

      {/* Overlay with lock icon and upgrade prompt */}
      <div
        data-testid="locked-overlay"
        className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/20 backdrop-blur-sm rounded-lg pointer-events-auto"
        role="img"
        aria-label="Feature locked - upgrade to Pro to access"
      >
        {/* Lock icon */}
        <div
          className="flex items-center justify-center w-12 h-12 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-lg"
          data-icon="lock"
        >
          <Lock className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </div>

        {/* Pro badge */}
        <TierBadge tier="pro" showIcon size="md" />

        {/* Upgrade button */}
        <Button
          onClick={handleUpgradeClick}
          className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
          size="sm"
        >
          Upgrade to Pro
        </Button>

        {/* Optional: Help text */}
        <p className="text-xs text-slate-600 dark:text-slate-300 text-center px-2">
          This feature is only available in Pro
        </p>
      </div>
    </div>
  );
}

export default LockedFeatureOverlay;
