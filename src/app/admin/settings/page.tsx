"use client";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { TrialBudgetCard } from "./components/trial-budget-card";
import { SystemInfoCard } from "./components/system-info-card";

export default function AdminSettingsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrialBudgetCard />
        <SystemInfoCard />
      </div>
    </div>
  );
}
