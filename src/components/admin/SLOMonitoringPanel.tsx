/**
 * SLO Monitoring Panel
 *
 * V1Plan FASE 2.0.7: SLO status display with alerts
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SLOStatus, Alert, GoNoGoResult } from "@/lib/alerting/types";

interface SLOMonitoringPanelProps {
  refreshInterval?: number;
}

interface ApiResponse {
  sloStatuses?: SLOStatus[];
  activeAlerts?: Alert[];
  goNoGoResult?: GoNoGoResult;
}

export function SLOMonitoringPanel({
  refreshInterval = 30000,
}: SLOMonitoringPanelProps) {
  const [sloStatuses, setSLOStatuses] = useState<SLOStatus[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [goNoGoResult, setGoNoGoResult] = useState<GoNoGoResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/admin/feature-flags?health=true&gonogo=true",
      );
      if (!response.ok) throw new Error("Failed to fetch SLO data");

      const data: ApiResponse = await response.json();
      setSLOStatuses(data.sloStatuses || []);
      setAlerts(data.activeAlerts || []);
      setGoNoGoResult(data.goNoGoResult || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    // In a real implementation, this would call an API
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: "acknowledged" as const,
              acknowledgedAt: new Date(),
            }
          : a,
      ),
    );
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Go/No-Go Decision */}
      {goNoGoResult && <GoNoGoCard result={goNoGoResult} />}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <AlertsCard alerts={alerts} onAcknowledge={handleAcknowledgeAlert} />
      )}

      {/* SLO Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle>SLO Status</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sloStatuses.map((slo) => (
                <SLOCard key={slo.sloId} slo={slo} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components

interface GoNoGoCardProps {
  result: GoNoGoResult;
}

function GoNoGoCard({ result }: GoNoGoCardProps) {
  const colors = {
    go: "border-green-500 bg-green-50",
    nogo: "border-red-500 bg-red-50",
    degraded: "border-yellow-500 bg-yellow-50",
  };

  const labels = {
    go: "GO - Ready for Release",
    nogo: "NO-GO - Blocking Issues",
    degraded: "DEGRADED - Proceed with Caution",
  };

  return (
    <Card className={colors[result.decision]}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{labels[result.decision]}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm">
            {result.passedCount}/{result.checks.length} checks passed
            {result.requiredFailures > 0 && (
              <span className="text-red-600 ml-2">
                ({result.requiredFailures} required failures)
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {result.checks.map((check) => (
              <span
                key={check.checkId}
                className={`text-xs px-2 py-1 rounded ${
                  check.status === "pass"
                    ? "bg-green-100 text-green-700"
                    : check.status === "fail"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                }`}
                title={check.message || check.name}
              >
                {check.name}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertsCardProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => void;
}

function AlertsCard({ alerts, onAcknowledge }: AlertsCardProps) {
  const severityColors = {
    info: "border-blue-300 bg-blue-50",
    warning: "border-yellow-300 bg-yellow-50",
    error: "border-orange-300 bg-orange-50",
    critical: "border-red-300 bg-red-50",
  };

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-red-700">
          Active Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${severityColors[alert.severity]}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.message}
                  </p>
                </div>
                {alert.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAcknowledge(alert.id)}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SLOCardProps {
  slo: SLOStatus;
}

function SLOCard({ slo }: SLOCardProps) {
  const statusColors = {
    healthy: "text-green-600",
    warning: "text-yellow-600",
    breached: "text-red-600",
  };

  const trendIcons = {
    improving: "↑",
    stable: "→",
    degrading: "↓",
  };

  const percentage = Math.min(100, Math.max(0, slo.currentValue));
  const progressColor =
    slo.status === "healthy"
      ? "bg-green-500"
      : slo.status === "warning"
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">
          {slo.sloId.replace(/-/g, " ")}
        </span>
        <span className={`text-sm ${statusColors[slo.status]}`}>
          {slo.currentValue.toFixed(1)}% {trendIcons[slo.trend]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">
          Target: {slo.target}%
        </span>
        <span className="text-xs text-muted-foreground">
          Budget: {slo.errorBudgetRemaining.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export default SLOMonitoringPanel;
