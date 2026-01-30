/**
 * Ops Dashboard Admin Page
 * Real-time monitoring: users online, requests, voice, database
 */

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import type { OpsDashboardResponse } from "@/lib/admin/ops-dashboard-types";
import { OnlineUsersCard, RequestMetricsCard } from "./components";
import { VoiceMetricsCard, DatabaseMetricsCard } from "./components-extended";

export const dynamic = "force-dynamic";

export default function OpsDashboardPage() {
  const [data, setData] = useState<OpsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const response = await fetch("/api/admin/ops-dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch metrics");
      }
      const metricsData = (await response.json()) as OpsDashboardResponse;
      setData(metricsData);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    void fetchMetrics();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchMetrics();
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Operations Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring of system metrics and user activity
          </p>
        </div>
        {lastUpdate && (
          <div className="text-sm text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {loading && (
        <Card className="p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {!loading && !error && data && (
        <div className="grid gap-6 md:grid-cols-2">
          <OnlineUsersCard metrics={data.onlineUsers} />
          <RequestMetricsCard metrics={data.requests} />
          <VoiceMetricsCard metrics={data.voice} />
          <DatabaseMetricsCard metrics={data.database} />
        </div>
      )}

      {!loading && !error && !data && (
        <Card className="p-6">
          <p className="text-muted-foreground">No data available</p>
        </Card>
      )}
    </div>
  );
}
