"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import { ProfileCardsSection } from "./accessibility-panel-mobile/profile-cards-section";
import { SettingsTogglesSection } from "./accessibility-panel-mobile/settings-toggles-section";
import { TextPreviewSection } from "./accessibility-panel-mobile/text-preview-section";
import { ResetButton } from "./accessibility-panel-mobile/reset-button";

/**
 * Mobile-optimized accessibility panel component
 * F-37: Accessibility settings panel optimized for mobile
 *
 * Features:
 * - Large toggle switches (44px+ height)
 * - Profile presets as visual cards (Dyslexia, ADHD, etc.)
 * - Clear visual feedback on selection
 * - Text size preview in real-time
 * - All controls have 44px+ touch targets
 * - Uses xs: breakpoint for mobile optimization
 */
export function AccessibilityPanelMobile() {
  const t = useTranslations("settings.accessibility");
  const { settings, getFontSizeMultiplier } = useAccessibilityStore();

  const fontSizeMultiplier = getFontSizeMultiplier();

  return (
    <div
      className={cn(
        "w-full max-w-2xl mx-auto p-4 xs:p-3 space-y-6",
        settings.highContrast
          ? "bg-black border-2 border-yellow-400"
          : "bg-white dark:bg-slate-900",
      )}
    >
      {/* Header */}
      <div className="space-y-2">
        <h2
          className={cn(
            "text-xl xs:text-lg font-bold",
            settings.highContrast
              ? "text-yellow-400"
              : "text-slate-900 dark:text-white",
            settings.dyslexiaFont && "tracking-wide",
          )}
          style={{
            fontSize: `${18 * fontSizeMultiplier}px`,
          }}
        >
          {t("panelTitle")}
        </h2>
        <p
          className={cn(
            "text-sm",
            settings.highContrast
              ? "text-gray-400"
              : "text-slate-600 dark:text-slate-400",
            settings.dyslexiaFont && "tracking-wide",
          )}
          style={{
            fontSize: `${14 * fontSizeMultiplier}px`,
          }}
        >
          {t("mobileSubtitle")}
        </p>
      </div>

      {/* Profile Presets */}
      <ProfileCardsSection fontSizeMultiplier={fontSizeMultiplier} />

      {/* Individual Settings */}
      <SettingsTogglesSection fontSizeMultiplier={fontSizeMultiplier} />

      {/* Text Size Preview */}
      <TextPreviewSection fontSizeMultiplier={fontSizeMultiplier} />

      {/* Reset Button */}
      <ResetButton fontSizeMultiplier={fontSizeMultiplier} />
    </div>
  );
}
