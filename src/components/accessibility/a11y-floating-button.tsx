"use client";

/**
 * A11y Floating Button
 * Fixed button in bottom-right corner for quick access to accessibility settings
 * WCAG 2.1 AA compliant with 44x44px minimum touch target
 */

import { Accessibility } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";

interface A11yFloatingButtonProps {
  onClick: () => void;
  isExpanded: boolean;
  className?: string;
}

export function A11yFloatingButton({
  onClick,
  isExpanded,
  className,
}: A11yFloatingButtonProps) {
  const t = useTranslations('settings.accessibility');
  const activeProfile = useAccessibilityStore((state) => state.activeProfile);

  // Visual indicator when a profile is active
  const hasActiveProfile = activeProfile !== null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "flex items-center justify-center",
        "w-11 h-11 rounded-full", // 44x44px for WCAG touch target
        "bg-violet-600 dark:bg-violet-500",
        "hover:bg-violet-700 dark:hover:bg-violet-400",
        "text-white",
        "shadow-lg hover:shadow-xl",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
        "dark:focus:ring-offset-gray-900",
        hasActiveProfile && "ring-2 ring-offset-2 ring-green-400",
        className,
      )}
      aria-label={t('a11yOpenSettings')}
      aria-expanded={isExpanded}
      aria-controls="a11y-quick-panel"
      aria-haspopup="dialog"
    >
      <Accessibility className="w-5 h-5" aria-hidden="true" />
      {hasActiveProfile && (
        <span
          className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-900"
          aria-label={t('a11yActiveProfile')}
        />
      )}
    </button>
  );
}
