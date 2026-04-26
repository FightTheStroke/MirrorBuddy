"use client";

import {
  TextIcon,
  Brain,
  Eye,
  Hand,
  Puzzle,
  EarOff,
  Accessibility,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccessibilityStore } from "@/lib/accessibility";
import { useTranslations } from "next-intl";

interface ProfileCardsSectionProps {
  fontSizeMultiplier: number;
}

export function ProfileCardsSection({
  fontSizeMultiplier,
}: ProfileCardsSectionProps) {
  const t = useTranslations("settings");
  const {
    settings,
    activeProfile,
    applyDyslexiaProfile,
    applyADHDProfile,
    applyVisualImpairmentProfile,
    applyMotorImpairmentProfile,
    applyAutismProfile,
    applyAuditoryImpairmentProfile,
    applyCerebralPalsyProfile,
  } = useAccessibilityStore();

  const profiles = [
    {
      id: "dyslexia" as const,
      title: "Profilo Dislessia",
      description: "Font ottimizzato, spaziatura",
      icon: <TextIcon className="w-6 h-6" />,
      color: "blue",
      onClick: applyDyslexiaProfile,
    },
    {
      id: "adhd" as const,
      title: "Profilo ADHD",
      description: "Focus mode, timer e pause",
      icon: <Brain className="w-6 h-6" />,
      color: "purple",
      onClick: applyADHDProfile,
    },
    {
      id: "autism" as const,
      title: "Profilo Autismo",
      description: "Ambiente calmo, no distrazioni",
      icon: <Puzzle className="w-6 h-6" />,
      color: "teal",
      onClick: applyAutismProfile,
    },
    {
      id: "visual" as const,
      title: "Profilo Visivo",
      description: "Alto contrasto, testo grande",
      icon: <Eye className="w-6 h-6" />,
      color: "orange",
      onClick: applyVisualImpairmentProfile,
    },
    {
      id: "auditory" as const,
      title: "Profilo Uditivo",
      description: "Focus visivo",
      icon: <EarOff className="w-6 h-6" />,
      color: "pink",
      onClick: applyAuditoryImpairmentProfile,
    },
    {
      id: "motor" as const,
      title: "Profilo Motorio",
      description: "Navigazione tastiera",
      icon: <Hand className="w-6 h-6" />,
      color: "green",
      onClick: applyMotorImpairmentProfile,
    },
    {
      id: "cerebral" as const,
      title: "Paralisi Cerebrale",
      description: "Supporto completo",
      icon: <Accessibility className="w-6 h-6" />,
      color: "cyan",
      onClick: applyCerebralPalsyProfile,
    },
  ];

  return (
    <div className="space-y-3">
      <h3
        className={cn(
          "text-base font-semibold",
          settings.highContrast
            ? "text-yellow-400"
            : "text-slate-800 dark:text-white",
          settings.dyslexiaFont && "tracking-wide",
        )}
        style={{
          fontSize: `${16 * fontSizeMultiplier}px`,
        }}
      >
        {t("profiliPredefiniti")}
      </h3>

      <div
        className="grid xs:grid-cols-2 md:grid-cols-2 gap-3"
        data-testid="profiles-container"
      >
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={profile.onClick}
            data-testid={`profile-card-${profile.id}`}
            className={cn(
              "min-h-[44px] p-4 xs:p-3 rounded-lg transition-all flex flex-col gap-2",
              activeProfile === profile.id
                ? settings.highContrast
                  ? "border-2 border-yellow-400 bg-gray-900 ring-2 ring-yellow-400"
                  : `border-2 border-${profile.color}-500 bg-${profile.color}-50 dark:bg-${profile.color}-900/20 ring-2 ring-${profile.color}-500/50`
                : settings.highContrast
                  ? "border border-gray-700 bg-gray-900 hover:border-yellow-400"
                  : `bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent`,
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
            )}
            aria-label={profile.title}
          >
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  "p-2 rounded",
                  settings.highContrast
                    ? "bg-gray-700 text-yellow-400"
                    : `bg-${profile.color}-100 dark:bg-${profile.color}-900/30 text-${profile.color}-600 dark:text-${profile.color}-400`,
                )}
              >
                {profile.icon}
              </span>
              <div className="flex-1 text-left">
                <span
                  className={cn(
                    "block font-semibold xs:text-sm",
                    settings.highContrast
                      ? "text-white"
                      : "text-slate-900 dark:text-white",
                    settings.dyslexiaFont && "tracking-wide",
                  )}
                  style={{
                    fontSize: `${14 * fontSizeMultiplier}px`,
                  }}
                >
                  {profile.title}
                </span>
                <span
                  className={cn(
                    "block text-xs",
                    settings.highContrast
                      ? "text-gray-400"
                      : "text-slate-500 dark:text-slate-400",
                    settings.dyslexiaFont && "tracking-wide",
                  )}
                  style={{
                    fontSize: `${12 * fontSizeMultiplier}px`,
                  }}
                >
                  {profile.description}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
