"use client";

/**
 * A11y Profile Button
 * Button for selecting accessibility profile presets
 */

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Target,
  Eye,
  Hand,
  Puzzle,
  Ear,
  Accessibility,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { A11yProfileId } from "@/lib/accessibility";

export interface ProfileConfig {
  id: Exclude<A11yProfileId, null>;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const getProfileConfigs = (
  t: ReturnType<typeof useTranslations>,
): ProfileConfig[] => [
  {
    id: "dyslexia",
    label: t("profileDyslexia"),
    icon: BookOpen,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "adhd",
    label: t("profileADHD"),
    icon: Target,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/30",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  {
    id: "visual",
    label: t("profileVisual"),
    icon: Eye,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    id: "motor",
    label: t("profileMotor"),
    icon: Hand,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  {
    id: "autism",
    label: t("profileAutism"),
    icon: Puzzle,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-900/30",
    borderColor: "border-teal-200 dark:border-teal-800",
  },
  {
    id: "auditory",
    label: t("profileAuditory"),
    icon: Ear,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-900/30",
    borderColor: "border-rose-200 dark:border-rose-800",
  },
  {
    id: "cerebral",
    label: t("profileCerebral"),
    icon: Accessibility,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/30",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
];

// For backwards compatibility and static reference (without translations)
export const PROFILE_CONFIGS_BASE = [
  {
    id: "dyslexia",
    icon: BookOpen,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "adhd",
    icon: Target,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/30",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  {
    id: "visual",
    icon: Eye,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    id: "motor",
    icon: Hand,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  {
    id: "autism",
    icon: Puzzle,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-900/30",
    borderColor: "border-teal-200 dark:border-teal-800",
  },
  {
    id: "auditory",
    icon: Ear,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-900/30",
    borderColor: "border-rose-200 dark:border-rose-800",
  },
  {
    id: "cerebral",
    icon: Accessibility,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/30",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
] as const;

interface A11yProfileButtonProps {
  profile: ProfileConfig;
  isActive: boolean;
  onClick: () => void;
}

export function A11yProfileButton({
  profile,
  isActive,
  onClick,
}: A11yProfileButtonProps) {
  const t = useTranslations("settings.accessibility");
  const Icon = profile.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1",
        "p-3 rounded-lg",
        "border-2 transition-all duration-200",
        profile.bgColor,
        profile.borderColor,
        isActive && "ring-2 ring-offset-2 ring-violet-500",
        "hover:scale-105 hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
      )}
      aria-pressed={isActive}
      aria-label={`${t("a11yActivateProfile")} ${profile.label}`}
    >
      <Icon className={cn("w-5 h-5", profile.color)} aria-hidden="true" />
      <span className={cn("text-xs font-medium", profile.color)}>
        {profile.label}
      </span>
    </button>
  );
}
