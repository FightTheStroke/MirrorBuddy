"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  trackBetaCtaShown,
  trackBetaCtaClicked,
} from "@/lib/telemetry/trial-events";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface UpgradePromptProps {
  visitorId: string;
  feature: string;
  variant?: "inline" | "banner" | "sidebar";
  onRequestBeta: () => void;
}

/**
 * Contextual Upgrade Prompt
 *
 * Shown inline when user approaches limits or tries blocked features.
 * Multiple variants for different placements.
 */
export function UpgradePrompt({
  visitorId,
  feature,
  variant = "inline",
  onRequestBeta,
}: UpgradePromptProps) {
  const t = useTranslations("auth");
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!hasTrackedRef.current) {
      trackBetaCtaShown(visitorId, "upgrade_prompt");
      hasTrackedRef.current = true;
    }
  }, [visitorId]);

  const handleClick = () => {
    trackBetaCtaClicked(visitorId, "upgrade_prompt");
    onRequestBeta();
  };

  if (variant === "banner") {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <div>
              <p className="font-medium">
                {t("sblocca1")} {feature} {t("conMirrorbuddyBeta")}
              </p>
              <p className="text-sm text-white/80">
                {t("accessoCompletoATuttiIMaestriEStrumenti")}
              </p>
            </div>
          </div>
          <Button
            onClick={handleClick}
            variant="secondary"
            size="sm"
            className="shrink-0 gap-1"
          >
            {t("richiediBeta1")}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {t("provaGratuita")}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {t("vuoiContinuareAUsare")} {feature}?
        </p>
        <Button onClick={handleClick} size="sm" className="w-full gap-1">
          {t("richiediBeta")}
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  // Default: inline
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <Sparkles className="w-4 h-4 text-amber-500" />
      <span className="text-sm text-amber-700 dark:text-amber-300">
        {feature} {t("limitatoInProva")}
      </span>
      <button
        onClick={handleClick}
        className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline"
      >
        {t("sblocca")}
      </button>
    </div>
  );
}

export default UpgradePrompt;
