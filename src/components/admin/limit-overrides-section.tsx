import { LimitField } from "./limit-field";
import React from "react";

interface LimitOverrides {
  chatLimitDaily?: number | null;
  voiceMinutesDaily?: number | null;
  toolsLimitDaily?: number | null;
  docsLimitTotal?: number | null;
}

interface TierInfo {
  chatLimitDaily: number;
  voiceMinutesDaily: number;
  toolsLimitDaily: number;
  docsLimitTotal: number;
}

interface LimitOverridesSectionProps {
  tier: TierInfo;
  limitOverrides: LimitOverrides;
  onLimitChange: (overrides: LimitOverrides) => void;
  firstInputRef?: React.Ref<HTMLInputElement>;
}

export function LimitOverridesSection({
  tier,
  limitOverrides,
  onLimitChange,
  firstInputRef,
}: LimitOverridesSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
        Usage Limits
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <LimitField
          ref={firstInputRef}
          label="Daily Chat Messages"
          defaultValue={tier?.chatLimitDaily}
          value={limitOverrides.chatLimitDaily ?? ""}
          onChange={(val) =>
            onLimitChange({ ...limitOverrides, chatLimitDaily: val })
          }
        />
        <LimitField
          label="Daily Voice Minutes"
          defaultValue={tier?.voiceMinutesDaily}
          value={limitOverrides.voiceMinutesDaily ?? ""}
          onChange={(val) =>
            onLimitChange({ ...limitOverrides, voiceMinutesDaily: val })
          }
        />
        <LimitField
          label="Daily Tools Usage"
          defaultValue={tier?.toolsLimitDaily}
          value={limitOverrides.toolsLimitDaily ?? ""}
          onChange={(val) =>
            onLimitChange({ ...limitOverrides, toolsLimitDaily: val })
          }
        />
        <LimitField
          label="Total Documents"
          defaultValue={tier?.docsLimitTotal}
          value={limitOverrides.docsLimitTotal ?? ""}
          onChange={(val) =>
            onLimitChange({ ...limitOverrides, docsLimitTotal: val })
          }
        />
      </div>
    </div>
  );
}
