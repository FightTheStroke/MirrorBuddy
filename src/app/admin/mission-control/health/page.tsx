/**
 * Service Health Monitor Page
 * Admin interface for monitoring all external service health
 */

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, AlertCircle, RefreshCw } from "lucide-react";
import { StatusBadge, StatusIcon } from "./status-utils";
import type {
  HealthAggregatorResponse,
  ServiceHealth,
} from "@/lib/admin/health-aggregator-types";

export const dynamic = "force-dynamic";

export default function ServiceHealthPage() {
  const [healthData, setHealthData] = useState<HealthAggregatorResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/health-aggregator");
      if (!response.ok) {
        throw new Error("Failed to fetch health data");
      }
      const data = await response.json();
      setHealthData(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch health data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      void fetchHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    void fetchHealth();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Health</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of all external services
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {lastRefresh && (
        <p className="text-sm text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Overall Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <StatusIcon
                status={healthData.overallStatus}
                className="h-8 w-8"
              />
              <StatusBadge
                status={healthData.overallStatus}
                className="text-lg px-4 py-2"
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Based on {healthData.configuredCount} configured{" "}
              {healthData.configuredCount === 1 ? "service" : "services"}
            </p>
          </CardContent>
        </Card>
      )}

      {loading && !healthData && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {!loading &&
        !error &&
        healthData &&
        (() => {
          const configuredServices = healthData.services.filter(
            (s) => s.configured,
          );
          const unconfiguredServices = healthData.services.filter(
            (s) => !s.configured,
          );

          const renderServiceCard = (service: ServiceHealth) => (
            <Card key={service.name}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{service.name}</span>
                  <StatusIcon status={service.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <StatusBadge status={service.status} />
                </div>

                {service.responseTimeMs !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Response:
                    </span>
                    <span className="text-sm font-medium">
                      {service.responseTimeMs}ms
                    </span>
                  </div>
                )}

                {service.details && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Details:
                    </span>
                    <span className="text-sm font-medium">
                      {service.details}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Checked:
                  </span>
                  <span className="text-sm font-medium">
                    {new Date(service.lastChecked).toLocaleTimeString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          );

          if (configuredServices.length === 0) {
            return (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <h3 className="text-lg font-semibold mb-2">
                  No services configured yet
                </h3>
                <p className="text-muted-foreground">
                  Configure your services to start monitoring their health
                  status.
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {configuredServices.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    Configured Services
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {configuredServices.map(renderServiceCard)}
                  </div>
                </div>
              )}

              {unconfiguredServices.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Not Configured</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {unconfiguredServices.map((service) => (
                      <Card key={service.name} className="opacity-60">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between text-base">
                            <span>{service.name}</span>
                            <StatusIcon status="unknown" />
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Status:
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Not Configured
                            </span>
                          </div>
                          {service.details && (
                            <p className="text-sm text-muted-foreground">
                              {service.details}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
