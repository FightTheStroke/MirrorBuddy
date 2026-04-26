"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import type { SafetyDashboardResponse } from "@/app/api/admin/safety/route";
import { useTranslations } from "next-intl";

interface SafetyEscalationsProps {
  escalations: SafetyDashboardResponse["escalations"];
}

export function SafetyEscalations({ escalations }: SafetyEscalationsProps) {
  const t = useTranslations("admin");
  if (escalations.length === 0) return null;

  return (
    <Card className="mb-8 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <AlertTriangle className="h-5 w-5" />
          {t("activeEscalations")}
        </CardTitle>
        <CardDescription className="text-amber-800 dark:text-amber-200">
          {t("eventsRequiringHumanIntervention")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {escalations.slice(0, 10).map((escalation) => (
            <div
              key={escalation.id}
              className="p-3 bg-card rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between"
            >
              <div className="flex-1">
                <p className="font-medium text-foreground capitalize">
                  {escalation.trigger.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(escalation.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!escalation.resolved && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200">
                    {t("unresolved")}
                  </span>
                )}
                {escalation.resolved && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-200">
                    {t("resolved")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
