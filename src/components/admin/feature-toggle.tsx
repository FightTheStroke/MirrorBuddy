"use client";

import { useTranslations } from "next-intl";
interface FeatureToggleProps {
  label: string;
  defaultValue?: boolean;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}

export function FeatureToggle({
  label,
  defaultValue,
  value,
  onChange,
}: FeatureToggleProps) {
  const t = useTranslations("admin");
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
      <label className="text-sm text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="flex items-center gap-2">
        {defaultValue !== undefined && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t("default")} {defaultValue ? "Yes" : "No"}
          </span>
        )}
        <select
          value={value === undefined ? "default" : value ? "true" : "false"}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === "default" ? undefined : val === "true");
          }}
          className="px-3 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        >
          <option value="default">{t("useDefault")}</option>
          <option value="true">{t("enabled")}</option>
          <option value="false">{t("disabled")}</option>
        </select>
      </div>
    </div>
  );
}
