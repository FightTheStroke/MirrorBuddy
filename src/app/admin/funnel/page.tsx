"use client";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/admin/kpi-card";
import { FunnelChart } from "@/components/admin/funnel-chart";
import { ChurnMetrics } from "@/components/admin/churn-metrics";
import { UserJourneyLookup } from "@/components/admin/user-journey-lookup";
import { CohortAnalysis } from "@/components/admin/cohort-analysis";
import {
  Users,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FunnelMetrics {
  stages: Array<{
    stage: string;
    count: number;
    conversionRate: number | null;
    avgTimeFromPrevious: number | null;
  }>;
  totals: {
    uniqueVisitors: number;
    uniqueConverted: number;
    overallConversionRate: number;
  };
  period: { start: string; end: string };
}

const PERIODS = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
] as const;

export default function FunnelDashboard() {
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/funnel/metrics?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch metrics");
      setMetrics(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleExport = (format: "csv" | "json") => {
    if (!metrics) return;
    const data =
      format === "json"
        ? JSON.stringify(metrics, null, 2)
        : [
            "stage,count,conversionRate,avgTimeMs",
            ...metrics.stages.map(
              (s) =>
                `${s.stage},${s.count},${s.conversionRate ?? ""},${s.avgTimeFromPrevious ?? ""}`,
            ),
          ].join("\n");
    const blob = new Blob([data], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `funnel-${days}d.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  const dropoffRate = metrics ? 100 - metrics.totals.overallConversionRate : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toolbar: period selector + export */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                days === p.value
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            JSON
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Visitors"
          value={metrics?.totals.uniqueVisitors ?? 0}
          subValue="Unique visitors tracked"
          icon={Users}
          color="blue"
        />
        <KpiCard
          title="Conversion Rate"
          value={`${(metrics?.totals.overallConversionRate ?? 0).toFixed(1)}%`}
          subValue="Visitor to Active"
          icon={TrendingUp}
          color="green"
        />
        <KpiCard
          title="Active Users"
          value={metrics?.totals.uniqueConverted ?? 0}
          subValue="Fully converted"
          icon={UserCheck}
          color="purple"
        />
        <KpiCard
          title="Drop-off Rate"
          value={`${dropoffRate.toFixed(1)}%`}
          subValue="Did not convert"
          icon={AlertTriangle}
          color="amber"
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Funnel Stages</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics && <FunnelChart stages={metrics.stages} showVelocity />}
          </CardContent>
        </Card>
        <UserJourneyLookup />
      </div>

      <CohortAnalysis />
      <ChurnMetrics />
    </div>
  );
}
