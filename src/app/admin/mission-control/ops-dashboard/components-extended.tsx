"use client";

/**
 * Ops Dashboard Extended Components
 * UI components for voice and database metrics
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Database } from "lucide-react";
import type {
  VoiceMetrics,
  DatabaseMetrics,
} from "@/lib/admin/ops-dashboard-types";
import { useTranslations } from "next-intl";

interface VoiceMetricsCardProps {
  metrics: VoiceMetrics;
}

export function VoiceMetricsCard({ metrics }: VoiceMetricsCardProps) {
  const t = useTranslations("admin");
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          {t("voiceSessions")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold">{metrics.activeSessions}</div>
            <p className="text-xs text-muted-foreground">{t("activeSessions")}</p>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {metrics.totalMinutesToday.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">{t("minutesToday")}</p>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {formatDuration(metrics.avgDuration)}
            </div>
            <p className="text-xs text-muted-foreground">{t("avgDuration")}</p>
          </div>
        </div>

        {metrics.activeSessions === 0 &&
          metrics.totalMinutesToday === 0 &&
          metrics.avgDuration === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("noVoiceActivityToday")}
            </p>
          )}
      </CardContent>
    </Card>
  );
}

interface DatabaseMetricsCardProps {
  metrics: DatabaseMetrics;
}

export function DatabaseMetricsCard({ metrics }: DatabaseMetricsCardProps) {
  const t = useTranslations("admin");
  const getConnectionColor = (count: number): string => {
    if (count === 0) return "text-muted-foreground";
    if (count < 10) return "text-green-600";
    if (count < 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {t("databaseMetrics")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div
              className={`text-2xl font-bold ${getConnectionColor(metrics.activeConnections)}`}
            >
              {metrics.activeConnections}
            </div>
            <p className="text-xs text-muted-foreground">{t("activeConnections")}</p>
          </div>
          <div>
            <div className="text-2xl font-bold">{metrics.queryCount}</div>
            <p className="text-xs text-muted-foreground">{t("queriesSec")}</p>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {metrics.avgQueryTime.toFixed(1)}{t("ms")}
            </div>
            <p className="text-xs text-muted-foreground">{t("avgQueryTime")}</p>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {metrics.tableSize.toFixed(1)}MB
            </div>
            <p className="text-xs text-muted-foreground">{t("databaseSize")}</p>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="pt-2">
          {metrics.activeConnections === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("noActiveConnections")}
            </p>
          )}
          {metrics.activeConnections > 0 && metrics.activeConnections < 10 && (
            <p className="text-sm text-green-600">{t("connectionPoolHealthy")}</p>
          )}
          {metrics.activeConnections >= 10 &&
            metrics.activeConnections < 50 && (
              <p className="text-sm text-yellow-600">
                {t("moderateConnectionLoad")}
              </p>
            )}
          {metrics.activeConnections >= 50 && (
            <p className="text-sm text-red-600">{t("highConnectionLoad")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
