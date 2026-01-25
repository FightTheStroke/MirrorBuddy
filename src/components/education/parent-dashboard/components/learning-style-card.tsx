"use client";

import {
  Eye,
  Ear,
  Hand,
  BookOpen,
  Clock,
  Sun,
  Moon,
  Sunset,
  Brain,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";
import type { LearningStyleProfile } from "@/types";

interface LearningStyleCardProps {
  style: LearningStyleProfile;
}

export function LearningStyleCard({ style }: LearningStyleCardProps) {
  const t = useTranslations("education.parent-dashboard.learning-style");
  const { settings } = useAccessibilityStore();

  const channelIcons = {
    visual: Eye,
    auditory: Ear,
    kinesthetic: Hand,
    reading_writing: BookOpen,
  };

  const channelLabels = {
    visual: t("channels.visual"),
    auditory: t("channels.auditory"),
    kinesthetic: t("channels.kinesthetic"),
    reading_writing: t("channels.reading_writing"),
  };

  const timeIcons = {
    morning: Sun,
    afternoon: Sunset,
    evening: Moon,
  };

  const timeLabels = {
    morning: t("times.morning"),
    afternoon: t("times.afternoon"),
    evening: t("times.evening"),
  };

  const ChannelIcon = channelIcons[style.preferredChannel];
  const TimeIcon = timeIcons[style.preferredTimeOfDay];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        className={cn(
          "p-4 rounded-lg text-center",
          settings.highContrast
            ? "bg-gray-900 border border-yellow-400"
            : "bg-slate-100 dark:bg-slate-800",
        )}
      >
        <ChannelIcon
          className={cn(
            "w-8 h-8 mx-auto mb-2",
            settings.highContrast
              ? "text-yellow-400"
              : "text-blue-600 dark:text-blue-400",
          )}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("preferred-channel")}
        </p>
        <p
          className={cn(
            "font-medium",
            settings.highContrast
              ? "text-white"
              : "text-slate-900 dark:text-white",
          )}
        >
          {channelLabels[style.preferredChannel]}
        </p>
      </div>

      <div
        className={cn(
          "p-4 rounded-lg text-center",
          settings.highContrast
            ? "bg-gray-900 border border-yellow-400"
            : "bg-slate-100 dark:bg-slate-800",
        )}
      >
        <Clock
          className={cn(
            "w-8 h-8 mx-auto mb-2",
            settings.highContrast
              ? "text-yellow-400"
              : "text-emerald-600 dark:text-emerald-400",
          )}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("optimal-session")}
        </p>
        <p
          className={cn(
            "font-medium",
            settings.highContrast
              ? "text-white"
              : "text-slate-900 dark:text-white",
          )}
        >
          {style.optimalSessionDuration} min
        </p>
      </div>

      <div
        className={cn(
          "p-4 rounded-lg text-center",
          settings.highContrast
            ? "bg-gray-900 border border-yellow-400"
            : "bg-slate-100 dark:bg-slate-800",
        )}
      >
        <TimeIcon
          className={cn(
            "w-8 h-8 mx-auto mb-2",
            settings.highContrast
              ? "text-yellow-400"
              : "text-amber-600 dark:text-amber-400",
          )}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("best-time")}
        </p>
        <p
          className={cn(
            "font-medium",
            settings.highContrast
              ? "text-white"
              : "text-slate-900 dark:text-white",
          )}
        >
          {timeLabels[style.preferredTimeOfDay]}
        </p>
      </div>

      <div
        className={cn(
          "p-4 rounded-lg text-center",
          settings.highContrast
            ? "bg-gray-900 border border-yellow-400"
            : "bg-slate-100 dark:bg-slate-800",
        )}
      >
        <Brain
          className={cn(
            "w-8 h-8 mx-auto mb-2",
            settings.highContrast
              ? "text-yellow-400"
              : "text-purple-600 dark:text-purple-400",
          )}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("approach")}
        </p>
        <p
          className={cn(
            "font-medium",
            settings.highContrast
              ? "text-white"
              : "text-slate-900 dark:text-white",
          )}
        >
          {style.challengePreference === "step_by_step"
            ? t("preferences.step_by_step")
            : style.challengePreference === "big_picture"
              ? t("preferences.big_picture")
              : t("preferences.mixed")}
        </p>
      </div>
    </div>
  );
}
