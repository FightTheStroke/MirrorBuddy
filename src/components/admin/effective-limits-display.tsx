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
            Tier Defaults
          </h4>
          <div className="space-y-2 text-sm">
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">Chat:</span>{" "}
              {tier?.chatLimitDaily || "—"}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">Voice:</span>{" "}
              {tier?.voiceMinutesDaily || "—"} min
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">Tools:</span>{" "}
              {tier?.toolsLimitDaily || "—"}
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">Docs:</span>{" "}
              {tier?.docsLimitTotal || "—"}
            </p>
          </div>
        </div>

        {/* Effective Limits Column */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            Effective Limits
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-medium">Chat:</span>{" "}
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
                  Override
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-medium">Voice:</span>{" "}
                {effectiveLimits.voiceMinutesDaily || "—"} min
              </span>
              {isOverridden(
                limitOverrides.voiceMinutesDaily,
                tier?.voiceMinutesDaily,
              ) && (
                <span
                  data-testid="override-badge"
                  className="override-badge-styling inline-block px-2 py-1 text-xs font-semibold text-white bg-amber-500 rounded-full"
                >
                  Override
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-medium">Tools:</span>{" "}
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
                  Override
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                <span className="font-medium">Docs:</span>{" "}
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
                  Override
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
