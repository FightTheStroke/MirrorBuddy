"use client";

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TierName } from "@/types/tier-types";

interface TierBadgeProps {
  /**
   * The tier level to display
   */
  tier: TierName;

  /**
   * Whether to show an icon next to the tier label
   */
  showIcon?: boolean;

  /**
   * Size variant for the badge
   * @default 'sm'
   */
  size?: "sm" | "md";

  /**
   * Optional CSS class to apply to the badge container
   */
  className?: string;
}

/**
 * TierBadge - Visual indicator for subscription tier level
 *
 * Displays a small badge showing the subscription tier with appropriate styling:
 * - Pro: Purple/gold, prominent (semibold, larger)
 * - Base: Blue, subtle (normal weight)
 * - Trial: Gray, minimal (reduced emphasis)
 *
 * @example
 * <TierBadge tier="pro" showIcon />
 * <TierBadge tier="base" />
 * <TierBadge tier="trial" />
 */
export function TierBadge({
  tier,
  showIcon = false,
  size = "sm",
  className,
}: TierBadgeProps) {
  // Map tier names to display labels and styling
  const tierConfig = {
    pro: {
      label: "Pro",
      classes: "bg-purple-600 text-white font-semibold",
      ariaLabel: "Pro tier subscription",
    },
    base: {
      label: "Base",
      classes: "bg-blue-500 text-white text-xs",
      ariaLabel: "Base tier subscription",
    },
    trial: {
      label: "Trial",
      classes: "bg-slate-300 text-slate-700 text-xs",
      ariaLabel: "Trial tier subscription",
    },
  };

  const sizeClasses = {
    sm: "px-2 py-1",
    md: "px-3 py-1.5 text-sm",
  };

  const config = tierConfig[tier];

  return (
    <div
      role="img"
      aria-label={config.ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full",
        sizeClasses[size],
        config.classes,
        className,
      )}
    >
      {showIcon && tier === "pro" && <Crown className="w-3 h-3" />}
      <span>{config.label}</span>
    </div>
  );
}
