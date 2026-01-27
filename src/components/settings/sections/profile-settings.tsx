"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Gauge, RotateCcw, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeachingStyle } from "@/lib/stores";
import { useSettingsStore } from "@/lib/stores";
import { TEACHING_STYLES } from "../constants";

// Profile Settings
interface ProfileSettingsProps {
  profile: {
    name: string;
    gradeLevel: string;
    learningGoals: string[];
    teachingStyle: TeachingStyle;
  };
  onUpdate: (updates: Partial<ProfileSettingsProps["profile"]>) => void;
}

export function ProfileSettings({ profile, onUpdate }: ProfileSettingsProps) {
  const t = useTranslations("settings.profile");
  const router = useRouter();
  const { adaptiveDifficultyMode, setAdaptiveDifficultyMode } =
    useSettingsStore();

  const gradeLevels = [
    { value: "", label: "Seleziona..." },
    { value: "primary", label: "Scuola Primaria (6-10 anni)" },
    { value: "middle", label: "Scuola Media (11-13 anni)" },
    { value: "high", label: "Scuola Superiore (14-18 anni)" },
    { value: "university", label: "Università" },
    { value: "adult", label: "Formazione Continua" },
  ];

  const currentStyle = TEACHING_STYLES.find(
    (s) => s.value === (profile.teachingStyle || "balanced"),
  );
  const adaptiveModes = [
    {
      value: "manual",
      label: "Manuale",
      description: "Solo suggerimenti, il professore chiede conferma",
    },
    {
      value: "guided",
      label: "Guidata",
      description: "Piccoli aggiustamenti con avvisi chiari",
    },
    {
      value: "balanced",
      label: "Bilanciata",
      description: "Adatta ritmo e difficoltà mantenendo stabilità",
    },
    {
      value: "automatic",
      label: "Automatica",
      description: "Adattamento completo in tempo reale",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              {t("personalInfoTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("nameLabel")}
              </label>
              <input
                type="text"
                value={profile.name || ""}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder={t("namePlaceholder")}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t("gradeLevelLabel")}
              </label>
              <select
                value={profile.gradeLevel || ""}
                onChange={(e) => onUpdate({ gradeLevel: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {gradeLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teaching Style Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{currentStyle?.emoji || "⚖️"}</span>
            {t("teachingStyleTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            {t("teachingStyleDescription")}
          </p>

          {/* Current style display */}
          <div
            className={cn(
              "p-4 rounded-xl bg-gradient-to-r text-white",
              currentStyle?.color || "from-blue-400 to-indigo-500",
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentStyle?.emoji}</span>
              <div>
                <h4 className="font-bold text-lg">{currentStyle?.label}</h4>
                <p className="text-sm opacity-90">
                  {currentStyle?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Style selector */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {TEACHING_STYLES.map((style) => (
              <button
                key={style.value}
                onClick={() => onUpdate({ teachingStyle: style.value })}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all text-center",
                  (profile.teachingStyle || "balanced") === style.value
                    ? "border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 scale-105"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                )}
              >
                <span className="text-2xl block mb-1">{style.emoji}</span>
                <span className="text-xs font-medium">{style.label}</span>
              </button>
            ))}
          </div>

          {/* Style impact preview */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <h5 className="text-sm font-medium mb-2">
              {t("feedbackExampleTitle")}
            </h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
              {profile.teachingStyle === "super_encouraging" &&
                `"${t("feedbackSuperEncouraging")}"`}
              {profile.teachingStyle === "encouraging" &&
                `"${t("feedbackEncouraging")}"`}
              {(profile.teachingStyle === "balanced" ||
                !profile.teachingStyle) &&
                `"${t("feedbackBalanced")}"`}
              {profile.teachingStyle === "strict" && `"${t("feedbackStrict")}"`}
              {profile.teachingStyle === "brutal" && `"${t("feedbackBrutal")}"`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Adaptive Difficulty Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-500" />
            {t("adaptiveDifficultyTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            {t("adaptiveDifficultyDescription")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {adaptiveModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setAdaptiveDifficultyMode(mode.value)}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all",
                  adaptiveDifficultyMode === mode.value
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                )}
              >
                <div className="font-medium">{mode.label}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {mode.description}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wave 3: Review Introduction Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-pink-500" />
            {t("introductionTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("introductionDescription")}
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/welcome?replay=true")}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t("reviewIntroductionButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
