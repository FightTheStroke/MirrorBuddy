/**
 * Audio output selector
 */

"use client";

import { Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface OutputSelectorProps {
  preferredOutputId: string | null;
  availableOutputs: MediaDeviceInfo[];
  onOutputChange: (deviceId: string) => void;
}

export function OutputSelector({
  preferredOutputId,
  availableOutputs,
  onOutputChange,
}: OutputSelectorProps) {
  const t = useTranslations("settings");
  return (
    <div className="space-y-2">
      <label
        htmlFor="settings-output"
        className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        <Volume2 className="w-4 h-4 text-amber-500" />
        {t("altoparlanti")}
      </label>
      <select
        id="settings-output"
        value={preferredOutputId || ""}
        onChange={(e) => onOutputChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
      >
        <option value="">{t("predefinitoDiSistema")}</option>
        {availableOutputs.map((output) => (
          <option key={output.deviceId} value={output.deviceId}>
            {output.label || `Altoparlante ${output.deviceId.slice(0, 8)}...`}
          </option>
        ))}
      </select>
    </div>
  );
}
