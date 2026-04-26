"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function OverrideInfoBanner() {
  const t = useTranslations("admin");
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 flex gap-2">
      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-blue-800 dark:text-blue-300">
        {t("overridesApplyOnlyToThisUserLeaveFieldsEmptyToUseT")}

      </p>
    </div>
  );
}
