"use client";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { useTranslations } from "next-intl";
import { TrialBudgetCard } from "./components/trial-budget-card";
import { SystemInfoCard } from "./components/system-info-card";

export default function AdminSettingsPage() {
  const t = useTranslations("admin.settings");
  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Settings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trial Budget Card */}
        <TrialBudgetCard />

        {/* System Info Card */}
        <SystemInfoCard />
      </div>
    </div>
  );
}
