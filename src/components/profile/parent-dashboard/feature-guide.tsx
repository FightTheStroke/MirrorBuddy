"use client";

import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { FeatureGuideCards } from "./feature-guide-cards";

interface FeatureGuideProps {
  highContrast?: boolean;
  className?: string;
}

/**
 * Feature guide container explaining MirrorBuddy functionality to parents.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function FeatureGuide({
  highContrast = false,
  className,
}: FeatureGuideProps) {
  const t = useTranslations("education.parent-dashboard.guide");

  return (
    <section
      className={cn("space-y-4", className)}
      aria-label={t("aria-label")}
    >
      <div className="flex items-center gap-2">
        <HelpCircle
          className={cn(
            "w-5 h-5",
            highContrast ? "text-yellow-400" : "text-primary",
          )}
          aria-hidden="true"
        />
        <h2
          className={cn(
            "text-lg font-semibold",
            highContrast ? "text-yellow-400" : "text-slate-900 dark:text-white",
          )}
        >
          {t("title")}
        </h2>
      </div>

      <p
        className={cn(
          "text-sm",
          highContrast
            ? "text-yellow-200"
            : "text-slate-600 dark:text-slate-400",
        )}
      >
        {t("intro")}
      </p>

      <FeatureGuideCards highContrast={highContrast} />
    </section>
  );
}
