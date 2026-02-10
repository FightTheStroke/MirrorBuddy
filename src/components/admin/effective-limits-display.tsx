"use client";

import { useTranslations } from "next-intl";
interface TierInfo {
  id: string;
  code: string;
  name: string;
  chatLimitDaily: number;
  voiceMinutesDaily: number;
  toolsLimitDaily: number;
  docsLimitTotal: number;
}

interface LimitOverrides {
  chatLimitDaily?: number | null;
  voiceMinutesDaily?: number | null;
  toolsLimitDaily?: number | null;
  docsLimitTotal?: number | null;
}

interface EffectiveLimitsDisplayProps {
  tier: TierInfo;
  limitOverrides: LimitOverrides;
}

function getEffectiveLimit(
  override: number | null | undefined,
  defaultValue: number | undefined,
): number | undefined {
  return override !== null && override !== undefined ? override : defaultValue;
}

function isOverridden(
  override: number | null | undefined,
  defaultValue: number | undefined,
): boolean {
  if (override === null || override === undefined) return false;
  return override !== defaultValue;
}

export function EffectiveLimitsDisplay({
  tier,
  limitOverrides,
}: EffectiveLimitsDisplayProps) {
  const t = useTranslations("admin");
  const effectiveLimits = {
    chatLimitDaily: getEffectiveLimit(
      limitOverrides.chatLimitDaily,
      tier?.chatLimitDaily,
    ),
    voiceMinutesDaily: getEffectiveLimit(
      limitOverrides.voiceMinutesDaily,
      tier?.voiceMinutesDaily,
    ),
    toolsLimitDaily: getEffectiveLimit(
      limitOverrides.toolsLimitDaily,
      tier?.toolsLimitDaily,
    ),
    docsLimitTotal: getEffectiveLimit(
      limitOverrides.docsLimitTotal,
      tier?.docsLimitTotal,
    ),
  };

  return (
    <div className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700/30 dark:to-blue-900/20 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
      <div className="grid grid-cols-2 gap-6">
        {/* Tier Defaults Column */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            {t("tierDefaults")}
          </h4>
          <div className="space-y-2 text-sm">
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">{t("chat1")}</span>{" "}
              {tier?.chatLimitDaily || "—"}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">{t("voice1")}</span>{" "}
              {tier?.voiceMinutesDaily || "—"} {t("min1")}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">{t("tools1")}</span>{" "}
              {tier?.toolsLimitDaily || "—"}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">{t("docs1")}</span>{" "}
              {tier?.docsLimitTotal || "—"}
            </p>
          </div>
        </div>

        {/* Effective Limits Column */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            {t("effectiveLimits")}
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-medium">{t("chat")}</span>{" "}
                {effectiveLimits.chatLimitDaily || "—"}
              </span>
              {isOverridden(
                limitOverrides.chatLimitDaily,
                tier?.chatLimitDaily,
              ) && (
                <span
                  data-testid="override-badge"
                  className="override-badge-styling inline-block px-2 py-1 text-xs font-semibold text-white bg-amber-500 rounded-full"
                >
                  {t("override3")}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-medium">{t("voice")}</span>{" "}
                {effectiveLimits.voiceMinutesDaily || "—"} {t("min")}
              </span>
              {isOverridden(
                limitOverrides.voiceMinutesDaily,
                tier?.voiceMinutesDaily,
              ) && (
                <span
                  data-testid="override-badge"
                  className="override-badge-styling inline-block px-2 py-1 text-xs font-semibold text-white bg-amber-500 rounded-full"
                >
                  {t("override2")}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-medium">{t("tools")}</span>{" "}
                {effectiveLimits.toolsLimitDaily || "—"}
              </span>
              {isOverridden(
                limitOverrides.toolsLimitDaily,
                tier?.toolsLimitDaily,
              ) && (
                <span
                  data-testid="override-badge"
                  className="override-badge-styling inline-block px-2 py-1 text-xs font-semibold text-white bg-amber-500 rounded-full"
                >
                  {t("override1")}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-medium">{t("docs")}</span>{" "}
                {effectiveLimits.docsLimitTotal || "—"}
              </span>
              {isOverridden(
                limitOverrides.docsLimitTotal,
                tier?.docsLimitTotal,
              ) && (
                <span
                  data-testid="override-badge"
                  className="override-badge-styling inline-block px-2 py-1 text-xs font-semibold text-white bg-amber-500 rounded-full"
                >
                  {t("override")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
