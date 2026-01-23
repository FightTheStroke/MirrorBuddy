"use client";

import { TrialBudgetCard } from "./components/trial-budget-card";
import { SystemInfoCard } from "./components/system-info-card";

export default function AdminSettingsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Impostazioni
        </h1>
        <p className="text-muted-foreground">
          Configurazione sistema MirrorBuddy
        </p>
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
