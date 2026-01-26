"use client";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Loader2,
  Download,
  AlertCircle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/logger/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SafetyOverviewCards } from "./components/safety-overview-cards";
import { SafetyEventsTable } from "./components/safety-events-table";
import { SafetyEscalations } from "./components/safety-escalations";
import { SafetyStatistics } from "./components/safety-statistics";
import { cn } from "@/lib/utils";
import type { SafetyDashboardResponse } from "@/app/api/admin/safety/route";

export default function AdminSafetyPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SafetyDashboardResponse | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/safety");
      if (!response.ok) throw new Error("Failed to fetch safety data");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds for real-time monitoring
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExportAuditLog = async () => {
    try {
      const auditData = {
        exportDate: new Date().toISOString(),
        overview: data?.overview,
        statistics: data?.statistics,
        recentEvents: data?.recentEvents,
      };

      const blob = new Blob([JSON.stringify(auditData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `safety-audit-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      clientLogger.error(
        "Failed to export audit log",
        { component: "AdminSafetyPage" },
        err,
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading safety dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={Shield}
        title="AI Safety Dashboard"
        rightContent={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
        }
      />

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Content */}
      {data && (
        <>
          <SafetyOverviewCards data={data} />
          <SafetyEventsTable events={data.recentEvents} />
          <SafetyEscalations escalations={data.escalations} />
          <SafetyStatistics statistics={data.statistics} />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleExportAuditLog}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Audit Log (JSON)
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
