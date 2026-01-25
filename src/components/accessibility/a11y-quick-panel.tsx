"use client";

/**
 * A11y Quick Panel
 * Slide-out panel with accessibility profile presets and quick settings
 */

import { useRef, useEffect } from "react";
import { X, RotateCcw, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import { A11yProfileButton, PROFILE_CONFIGS } from "./a11y-profile-button";

interface A11yQuickPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function A11yQuickPanel({ isOpen, onClose }: A11yQuickPanelProps) {
  const t = useTranslations("settings.accessibility");
  const panelRef = useRef<HTMLDivElement>(null);
  const activeProfile = useAccessibilityStore((state) => state.activeProfile);
  const settings = useAccessibilityStore((state) => state.settings);
  const updateSettings = useAccessibilityStore((state) => state.updateSettings);
  const resetSettings = useAccessibilityStore((state) => state.resetSettings);

  // Profile apply functions
  const applyDyslexia = useAccessibilityStore((s) => s.applyDyslexiaProfile);
  const applyADHD = useAccessibilityStore((s) => s.applyADHDProfile);
  const applyVisual = useAccessibilityStore(
    (s) => s.applyVisualImpairmentProfile,
  );
  const applyMotor = useAccessibilityStore(
    (s) => s.applyMotorImpairmentProfile,
  );
  const applyAutism = useAccessibilityStore((s) => s.applyAutismProfile);
  const applyAuditory = useAccessibilityStore(
    (s) => s.applyAuditoryImpairmentProfile,
  );
  const applyCerebral = useAccessibilityStore(
    (s) => s.applyCerebralPalsyProfile,
  );

  const profileAppliers: Record<string, () => void> = {
    dyslexia: applyDyslexia,
    adhd: applyADHD,
    visual: applyVisual,
    motor: applyMotor,
    autism: applyAutism,
    auditory: applyAuditory,
    cerebral: applyCerebral,
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const focusableEls = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    firstEl?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl?.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl?.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            id="a11y-quick-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a11y-panel-title"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 right-0 z-50",
              "w-full sm:w-80 max-h-[85vh]",
              "bg-white dark:bg-gray-800",
              "rounded-t-2xl sm:rounded-tl-2xl sm:rounded-bl-2xl sm:rounded-tr-none",
              "shadow-2xl",
              "overflow-y-auto",
            )}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2
                id="a11y-panel-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t("panelTitle")}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                aria-label={t("closePanel")}
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Profile Presets */}
              <section aria-labelledby="profiles-heading">
                <h3
                  id="profiles-heading"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
                >
                  {t("quickProfiles")}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {PROFILE_CONFIGS.map((profile) => (
                    <A11yProfileButton
                      key={profile.id}
                      profile={profile}
                      isActive={activeProfile === profile.id}
                      onClick={() => profileAppliers[profile.id]?.()}
                    />
                  ))}
                </div>
              </section>

              {/* Quick Toggles */}
              <section aria-labelledby="toggles-heading">
                <h3
                  id="toggles-heading"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
                >
                  {t("quickSettings")}
                </h3>
                <div className="space-y-3">
                  <QuickToggle
                    label={t("largeText")}
                    checked={settings.largeText}
                    onChange={(v) => updateSettings({ largeText: v })}
                  />
                  <QuickToggle
                    label={t("highContrast")}
                    checked={settings.highContrast}
                    onChange={(v) => updateSettings({ highContrast: v })}
                  />
                  <QuickToggle
                    label={t("reduceAnimations")}
                    checked={settings.reducedMotion}
                    onChange={(v) => updateSettings({ reducedMotion: v })}
                  />
                  <QuickToggle
                    label={t("dyslexiaFont")}
                    checked={settings.dyslexiaFont}
                    onChange={(v) => updateSettings({ dyslexiaFont: v })}
                  />
                </div>
              </section>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={resetSettings}
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t("resetSettings")}
                </button>
                <Link
                  href="/settings?section=accessibility"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-violet-600 text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                >
                  <Settings className="w-4 h-4" />
                  {t("allSettings")}
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface QuickToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function QuickToggle({ label, checked, onChange }: QuickToggleProps) {
  const id = `toggle-${label.toLowerCase().replace(/\s/g, "-")}`;

  return (
    <div className="flex items-center justify-between">
      <label
        htmlFor={id}
        className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
      >
        {label}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
          checked
            ? "bg-violet-600 dark:bg-violet-500"
            : "bg-gray-200 dark:bg-gray-600",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
