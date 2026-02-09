"use client";

/**
 * Recent Incidents Card
 * Shows recent telemetry events (safety, circuit breaker, API errors)
 * Plan 105 - W5-Alerting [T5-06]
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import type { RecentIncident } from "@/lib/admin/ops-dashboard-types";
import { useTranslations } from "next-intl";

interface IncidentsCardProps {
  incidents: RecentIncident[];
}

export function IncidentsCard({ incidents }: IncidentsCardProps) {
  const t = useTranslations("admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          {t("recentIncidents24h")}
          {incidents.length > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal">
              {incidents.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noIncidentsInTheLast24Hours")}
          </p>
        ) : (
          <div className="space-y-2">
            {incidents.slice(0, 10).map((inc) => (
              <div
                key={inc.id}
                className="flex items-start gap-2 border-b border-muted pb-2 last:border-0"
              >
                <SeverityDot severity={inc.severity} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatAction(inc.action)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(inc.timestamp)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {inc.category}
                    {inc.label ? ` - ${inc.label}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeverityDot({
  severity,
}: {
  severity: "info" | "warning" | "critical";
}) {
  const colors = {
    info: "bg-blue-500",
    warning: "bg-yellow-500",
    critical: "bg-red-500",
  };

  return (
    <div
      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors[severity]}`}
    />
  );
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
