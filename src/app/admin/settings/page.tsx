"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { TrialBudgetCard } from "./components/trial-budget-card";

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

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Placeholder 2</CardTitle>
            <CardDescription>Settings will be added here</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This section is ready for configuration options.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
