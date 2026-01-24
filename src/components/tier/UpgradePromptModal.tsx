"use client";

import { useEffect, useRef } from "react";
import { X, Sparkles, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentTier: "trial" | "base";
  triggerReason: string;
}

interface TriggerConfig {
  title: string;
  message: string;
  icon: React.ReactNode;
}

const TRIGGER_CONFIGS: Record<string, TriggerConfig> = {
  message_limit: {
    title: "Daily message limit reached",
    message:
      "You've used all your daily messages. Upgrade to Pro for unlimited conversations.",
    icon: <Sparkles className="w-8 h-8 text-white" />,
  },
  voice_limit: {
    title: "Voice minutes limit reached",
    message:
      "You've reached your daily voice limit. Upgrade to Pro for unlimited voice interactions.",
    icon: <Sparkles className="w-8 h-8 text-white" />,
  },
  tool_limit: {
    title: "Tool usage limit reached",
    message:
      "You've used all your daily tool credits. Upgrade to Pro for unlimited tool access.",
    icon: <Lock className="w-8 h-8 text-white" />,
  },
  feature_blocked: {
    title: "Feature not available",
    message:
      "This feature is only available in Pro. Upgrade to unlock premium features.",
    icon: <Lock className="w-8 h-8 text-white" />,
  },
  maestro_limit: {
    title: "Maestri limit reached",
    message:
      "You've reached the limit of available Maestri. Upgrade to Pro to access all Maestri.",
    icon: <Lock className="w-8 h-8 text-white" />,
  },
};

const TIER_EXPLANATIONS: Record<"trial" | "base", string> = {
  trial:
    "Upgrade to Pro for unlimited access to all features and remove all trial limitations.",
  base: "Unlock premium features with Pro to enhance your learning experience.",
};

/**
 * UpgradePromptModal
 *
 * Modal shown when users on Trial/Base tiers hit limits or try to access blocked features.
 * Prompts users to upgrade with clear CTAs and condensed feature comparison.
 *
 * Features:
 * - Dynamic title/message based on trigger reason
 * - Tier-specific explanations
 * - Dismissable (X, Escape, click outside)
 * - Accessible (ARIA, focus trap)
 */
export function UpgradePromptModal({
  isOpen,
  onClose,
  onUpgrade,
  currentTier,
  triggerReason,
}: UpgradePromptModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const modalId = "upgrade-prompt-modal";
  const titleId = `${modalId}-title`;

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length > 0) {
      focusableElements[0]?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const config =
    TRIGGER_CONFIGS[triggerReason] || TRIGGER_CONFIGS.feature_blocked;
  const explanation = TIER_EXPLANATIONS[currentTier];

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              {config.icon}
            </div>
          </div>

          {/* Title & Message */}
          <div className="text-center space-y-2">
            <h2
              id={titleId}
              className="text-2xl font-bold text-slate-900 dark:text-white"
            >
              {config.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              {config.message}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {explanation}
            </p>
          </div>

          {/* Comparison section */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
              What you&apos;re missing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Unlimited Messages
                  </p>
                  <p className="text-xs text-slate-500">No daily chat limits</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Unlimited Voice
                  </p>
                  <p className="text-xs text-slate-500">
                    Talk as long as you need
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    All Maestri
                  </p>
                  <p className="text-xs text-slate-500">
                    Access to 20+ AI tutors
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Premium Features
                  </p>
                  <p className="text-xs text-slate-500">
                    PDF export, advanced tools
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Maybe Later
          </Button>
          <Button
            onClick={onUpgrade}
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 order-1 sm:order-2"
          >
            Upgrade to Pro
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UpgradePromptModal;
