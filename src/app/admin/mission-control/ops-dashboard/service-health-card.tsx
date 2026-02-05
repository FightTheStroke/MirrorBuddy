/**
 * Service Health Card
 * Shows external service quota usage from ops dashboard data
 * Plan 105 - W5-Alerting [T5-06]
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartPulse } from "lucide-react";
import type { ServiceHealthItem } from "@/lib/admin/ops-dashboard-types";

interface ServiceHealthCardProps {
  items: ServiceHealthItem[];
}

export function ServiceHealthCard({ items }: ServiceHealthCardProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5" />
            Service Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No service data available
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by service
  const grouped = new Map<string, ServiceHealthItem[]>();
  for (const item of items) {
    const existing = grouped.get(item.service) || [];
    existing.push(item);
    grouped.set(item.service, existing);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5" />
          Service Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from(grouped.entries()).map(([service, metrics]) => (
          <div key={service} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{service}</span>
              <StatusBadge status={getWorstStatus(metrics)} />
            </div>
            {metrics.map((m) => (
              <div
                key={m.metric}
                className="flex items-center justify-between text-xs text-muted-foreground"
              >
                <span>{m.metric}</span>
                <span>{m.usagePercent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  status,
}: {
  status: "ok" | "warning" | "critical" | "exceeded";
}) {
  const colors = {
    ok: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    warning:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    exceeded: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}

function getWorstStatus(
  items: ServiceHealthItem[],
): "ok" | "warning" | "critical" | "exceeded" {
  const priority = ["exceeded", "critical", "warning", "ok"] as const;
  for (const p of priority) {
    if (items.some((i) => i.status === p)) return p;
  }
  return "ok";
}
