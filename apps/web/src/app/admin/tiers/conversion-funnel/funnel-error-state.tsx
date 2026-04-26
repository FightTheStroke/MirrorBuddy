"use client";

import { useTranslations } from "next-intl";
interface FunnelErrorStateProps {
  error: string;
}

export function FunnelErrorState({ error }: FunnelErrorStateProps) {
  const t = useTranslations("admin");
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg">
        {t("error")} {error}
      </div>
    </div>
  );
}
