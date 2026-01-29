"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gift, MessageCircle, Users, Wrench, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  trackBetaCtaShown,
  trackBetaCtaClicked,
} from "@/lib/telemetry/trial-events";

interface TrialHomeBannerProps {
  chatsRemaining: number;
  maxChats: number;
  visitorId?: string;
  className?: string;
}

/**
 * Persistent trial banner for home page main area.
 * Shows trial limits and CTA to request full access.
 * Cannot be dismissed - always visible for trial users.
 */
export function TrialHomeBanner({
  chatsRemaining,
  maxChats,
  visitorId,
  className,
}: TrialHomeBannerProps) {
  const router = useRouter();
  const hasTrackedRef = useRef(false);

  // Track CTA shown when banner is visible
  useEffect(() => {
    if (visitorId && !hasTrackedRef.current) {
      trackBetaCtaShown(visitorId, "header");
      hasTrackedRef.current = true;
    }
  }, [visitorId]);

  const handleRequestAccess = () => {
    if (visitorId) {
      trackBetaCtaClicked(visitorId, "header");
    }
    router.push("/invite/request");
  };

  const isLow = chatsRemaining <= 3;
  const progressPercent = ((maxChats - chatsRemaining) / maxChats) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-4 mb-6",
        isLow
          ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/50"
          : "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800/50",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: icon + content */}
        <div className="flex gap-3 flex-1">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              isLow
                ? "bg-amber-100 dark:bg-amber-800/30"
                : "bg-purple-100 dark:bg-purple-800/30",
            )}
          >
            <Gift
              className={cn(
                "w-5 h-5",
                isLow
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-purple-600 dark:text-purple-400",
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-semibold text-sm",
                isLow
                  ? "text-amber-900 dark:text-amber-100"
                  : "text-purple-900 dark:text-purple-100",
              )}
            >
              {isLow
                ? "Messaggi quasi esauriti!"
                : "Stai usando la versione di prova"}
            </p>

            {/* Progress bar */}
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-2 bg-white/60 dark:bg-gray-800/40 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    isLow
                      ? "bg-gradient-to-r from-amber-400 to-orange-500"
                      : "bg-gradient-to-r from-purple-400 to-pink-500",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
              <span
                className={cn(
                  "text-sm font-medium flex items-center gap-1",
                  isLow
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-purple-700 dark:text-purple-300",
                )}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                {chatsRemaining}/{maxChats}
              </span>
            </div>

            {/* Trial limits summary */}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />3 Maestri
              </span>
              <span className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" />
                Strumenti base
              </span>
            </div>
          </div>
        </div>

        {/* Right: CTA only */}
        <Button
          size="sm"
          onClick={handleRequestAccess}
          className={cn(
            "text-white",
            isLow
              ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
              : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700",
          )}
        >
          Richiedi accesso
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
