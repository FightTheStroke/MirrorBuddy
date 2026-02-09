"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface LimitFieldProps {
  label: string;
  defaultValue?: number;
  value: number | string;
  onChange: (value: number | null) => void;
}

export const LimitField = React.forwardRef<HTMLInputElement, LimitFieldProps>(
  ({ label, defaultValue, value, onChange }, ref) => {
    const t = useTranslations("admin");
    return (
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
        <div className="space-y-1">
          <input
            ref={ref}
            type="number"
            min="0"
            value={value}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder={defaultValue?.toString() || "0"}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          {defaultValue !== undefined && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("default")} {defaultValue}
            </p>
          )}
        </div>
      </div>
    );
  },
);
LimitField.displayName = "LimitField";
