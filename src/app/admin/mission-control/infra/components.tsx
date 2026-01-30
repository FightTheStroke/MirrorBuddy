/**
 * Infrastructure Panel Components
 * Reusable components for displaying service metrics
 */

import { Cloud } from "lucide-react";
import type {
  ServiceStatus,
  VercelMetrics,
} from "@/lib/admin/infra-panel-types";

/**
 * Status Badge Component
 */
interface StatusBadgeProps {
  status: ServiceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = {
    healthy: "bg-green-100 text-green-800",
    degraded: "bg-yellow-100 text-yellow-800",
    down: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * Metric Bar Component
 */
interface MetricBarProps {
  label: string;
  used: number;
  total: number;
  unit?: string;
  format?: (value: number) => string;
}

export function MetricBar({
  label,
  used,
  total,
  unit = "",
  format,
}: MetricBarProps) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const displayUsed = format ? format(used) : used.toLocaleString();
  const displayTotal = format ? format(total) : total.toLocaleString();

  const barColor =
    percentage >= 90
      ? "bg-red-500"
      : percentage >= 75
        ? "bg-yellow-500"
        : "bg-green-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {displayUsed} / {displayTotal} {unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="text-right text-xs text-muted-foreground">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Vercel Card Component
 */
interface VercelCardProps {
  metrics: VercelMetrics;
}

export function VercelCard({ metrics }: VercelCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-blue-600" />
          <span className="font-medium">Status</span>
        </div>
        <StatusBadge status={metrics.status} />
      </div>

      <MetricBar
        label="Bandwidth"
        used={metrics.bandwidthUsed}
        total={metrics.bandwidthLimit}
        format={formatBytes}
      />

      <MetricBar
        label="Builds"
        used={metrics.buildsUsed}
        total={metrics.buildsLimit}
      />

      <MetricBar
        label="Functions"
        used={metrics.functionsUsed}
        total={metrics.functionsLimit}
      />

      <div className="space-y-2 border-t pt-4">
        <div className="text-sm font-medium">Recent Deployments</div>
        {metrics.deployments.length > 0 ? (
          <div className="space-y-2">
            {metrics.deployments.slice(0, 3).map((deployment) => (
              <div
                key={deployment.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="truncate text-muted-foreground">
                  {deployment.url}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 ${
                    deployment.state === "READY"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {deployment.state}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No recent deployments
          </div>
        )}
      </div>
    </div>
  );
}
