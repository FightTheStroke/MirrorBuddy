"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, MessageCircle, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeviceType } from "@/hooks/use-device-type";
import { useTranslations } from "next-intl";

interface TrialStatus {
  isTrialMode: boolean;
  chatsUsed: number;
  chatsRemaining: number;
  maxChats: number;
}

interface TrialBannerMobileProps {
  trialStatus: TrialStatus;
}

/**
 * TrialBannerMobile - Responsive trial mode indicator
 * On mobile: Compact single-line indicator with expand/collapse
 * On desktop: Full banner with all trial information
 *
 * @component
 * @example
 * ```tsx
 * <TrialBannerMobile
 *   trialStatus={{
 *     isTrialMode: true,
 *     chatsUsed: 2,
 *     chatsRemaining: 8,
 *     maxChats: 10,
 *   }}
 * />
 * ```
 */
export function TrialBannerMobile({ trialStatus }: TrialBannerMobileProps) {
  const t = useTranslations("common");
  const { isPhone, isTablet } = useDeviceType();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if not in trial mode
  if (!trialStatus.isTrialMode) {
    return null;
  }

  const isMobileView = isPhone || isTablet;
  const isLowOnChats = trialStatus.chatsRemaining <= 3;

  // Color classes based on remaining chats
  const colorClasses = isLowOnChats
    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
    : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";

  const borderColorClasses = isLowOnChats
    ? "border-amber-200 dark:border-amber-800"
    : "border-purple-200 dark:border-purple-800";

  // Desktop: Always show full banner
  if (!isMobileView) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "mx-4 mt-4 rounded-lg border p-4",
          "flex items-center justify-between gap-4",
          colorClasses,
          borderColorClasses,
        )}
      >
        <div className="flex items-center gap-3">
          <Gift className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {t("trial1")} {trialStatus.chatsRemaining}/{trialStatus.maxChats}{" "}
              {t("messagesRemaining")}
            </p>
            <p className="text-xs mt-1 opacity-90">
              {t("upgradeToBaseTierForUnlimitedAccess")}
            </p>
          </div>
        </div>
        <Link
          href="/invite/request"
          className={cn(
            "flex-shrink-0 px-3 py-1.5 rounded-md font-medium text-sm",
            "transition-colors cursor-pointer",
            "hover:bg-current hover:bg-opacity-10",
            "border border-current border-opacity-20",
          )}
        >
          {t("upgrade")}
        </Link>
      </motion.div>
    );
  }

  // Mobile: Compact form with expand/collapse
  return (
    <>
      {/* Compact indicator */}
      <AnimatePresence mode="wait">
        {!isExpanded && (
          <motion.div
            key="compact"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            data-testid="trial-banner-compact"
            className={cn(
              "mx-2 mt-2 rounded-lg border p-3",
              "flex items-center justify-between gap-2",
              colorClasses,
              borderColorClasses,
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MessageCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold text-xs">
                {t("trialLabel")} {trialStatus.chatsRemaining}/{trialStatus.maxChats} {t("msgs")}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1 min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0 hover:bg-current hover:bg-opacity-10 rounded transition-colors"
              aria-label={t("expandTrialBanner")}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded banner */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "mx-2 mt-2 rounded-lg border p-4",
              "flex flex-col gap-3",
              colorClasses,
              borderColorClasses,
            )}
          >
            {/* Header with collapse button */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1">
                <Gift className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {t("trialMode")} {trialStatus.chatsRemaining}/
                    {trialStatus.maxChats} {t("messages1")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0 hover:bg-current hover:bg-opacity-10 rounded transition-colors"
                aria-label={t("collapseTrialBanner")}
              >
                <ChevronUp className="w-4 h-4 rotate-180" />
              </button>
            </div>

            {/* Info text */}
            <p className="text-xs leading-relaxed opacity-90">
              {t("youAposReUsingTheFreeTrialYouHave")}
              <span className="font-semibold">
                {trialStatus.chatsRemaining} {t("messages")}
              </span>{" "}
              {t("remainingThisMonth")}
            </p>

            {/* Upgrade link */}
            <Link
              href="/invite/request"
              className={cn(
                "block w-full px-3 py-2 rounded-md font-medium text-sm",
                "text-center transition-colors",
                "hover:bg-current hover:bg-opacity-10",
                "border border-current border-opacity-20",
              )}
            >
              {t("upgradeToBaseTier")}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
