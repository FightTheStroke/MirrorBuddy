/**
 * Infrastructure Service Cards
 * Supabase and Redis metric display components
 */

import { Database, Server } from "lucide-react";
import type {
  SupabaseMetrics,
  RedisMetrics,
} from "@/lib/admin/infra-panel-types";
import { StatusBadge, MetricBar, formatBytes } from "./components";

/**
 * Supabase Card Component
 */
interface SupabaseCardProps {
  metrics: SupabaseMetrics;
}

export function SupabaseCard({ metrics }: SupabaseCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-green-600" />
          <span className="font-medium">Status</span>
        </div>
        <StatusBadge status={metrics.status} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Database Size</span>
          <span className="text-sm font-medium">
            {formatBytes(metrics.databaseSize)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Connections</span>
          <span className="text-sm font-medium">{metrics.connections}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Storage Used</span>
          <span className="text-sm font-medium">
            {formatBytes(metrics.storageUsed)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Rows</span>
          <span className="text-sm font-medium">
            {metrics.rowCount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="text-xs text-muted-foreground">
          Active connections: {metrics.connections < 50 ? "Normal" : "High"}
        </div>
      </div>
    </div>
  );
}

/**
 * Redis Card Component
 */
interface RedisCardProps {
  metrics: RedisMetrics;
}

export function RedisCard({ metrics }: RedisCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-red-600" />
          <span className="font-medium">Status</span>
        </div>
        <StatusBadge status={metrics.status} />
      </div>

      <MetricBar
        label="Memory"
        used={metrics.memoryUsed}
        total={metrics.memoryMax}
        format={formatBytes}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Keys Count</span>
          <span className="text-sm font-medium">
            {metrics.keysCount.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Hit Rate</span>
          <span className="text-sm font-medium">
            {metrics.hitRate.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Commands</span>
          <span className="text-sm font-medium">
            {metrics.commands.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full transition-all duration-300 ${
              metrics.hitRate >= 90
                ? "bg-green-500"
                : metrics.hitRate >= 75
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${metrics.hitRate}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Cache efficiency: {metrics.hitRate >= 90 ? "Excellent" : "Good"}
        </div>
      </div>
    </div>
  );
}
