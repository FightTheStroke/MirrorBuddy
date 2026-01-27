"use client";

import {
  GraduationCap,
  Brain,
  Sparkles,
  Accessibility,
  MessageSquare,
  FileText,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface FeatureGuideCardsProps {
  highContrast?: boolean;
  className?: string;
}

interface FeatureCardData {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

/**
 * Feature guide cards explaining MirrorBuddy functionality.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function FeatureGuideCards({
  highContrast = false,
  className,
}: FeatureGuideCardsProps) {
  const t = useTranslations("education.parentDashboard.features");

  const FEATURES: FeatureCardData[] = [
    {
      icon: <GraduationCap className="w-5 h-5" />,
      title: t("maestriTitle"),
      description: t("maestriDesc"),
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      icon: <Brain className="w-5 h-5" />,
      title: t("flashcardsTitle"),
      description: t("flashcardsDesc"),
      color:
        "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: t("quizTitle"),
      description: t("quizDesc"),
      color:
        "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    },
    {
      icon: <Accessibility className="w-5 h-5" />,
      title: t("accessibilityTitle"),
      description: t("accessibilityDesc"),
      color:
        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: t("voiceTitle"),
      description: t("voiceDesc"),
      color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: t("mindmapTitle"),
      description: t("mindmapDesc"),
      color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
    },
  ];
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
        className,
      )}
      role="list"
      aria-label={t("ariaLabel")}
    >
      {FEATURES.map((feature) => (
        <article
          key={feature.title}
          className={cn(
            "p-4 rounded-xl border transition-all",
            highContrast
              ? "bg-black border-yellow-400 hover:bg-yellow-400/10"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md",
          )}
          role="listitem"
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "shrink-0 p-2 rounded-lg",
                highContrast ? "bg-yellow-400 text-black" : feature.color,
              )}
              aria-hidden="true"
            >
              {feature.icon}
            </div>
            <div>
              <h3
                className={cn(
                  "font-semibold mb-1",
                  highContrast
                    ? "text-yellow-400"
                    : "text-slate-900 dark:text-white",
                )}
              >
                {feature.title}
              </h3>
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  highContrast
                    ? "text-yellow-200"
                    : "text-slate-600 dark:text-slate-400",
                )}
              >
                {feature.description}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
