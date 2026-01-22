/**
 * Conversion Funnel Dashboard
 * Plan 069 - Admin view of user conversion funnel
 * F-05, F-06: Dashboard page with funnel visualization and KPI cards
 */

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/admin/kpi-card";
import { Users, TrendingUp, UserCheck, Clock } from "lucide-react";

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

export default function FunnelDashboard() {
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/admin/funnel/metrics?days=30");
        if (!res.ok) throw new Error("Failed to fetch metrics");
        const data = await res.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"
              />
            ))}
          </div>
          <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl mb-4" />
          <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
          Error loading funnel metrics: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Conversion Funnel
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Last 30 days •{" "}
          {metrics?.period.start
            ? new Date(metrics.period.start).toLocaleDateString()
            : ""}{" "}
          -{" "}
          {metrics?.period.end
            ? new Date(metrics.period.end).toLocaleDateString()
            : ""}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          subValue="Visitor to Active User"
          icon={TrendingUp}
          color="green"
        />
        <KpiCard
          title="Active Users"
          value={metrics?.totals.uniqueConverted ?? 0}
          subValue="Reached ACTIVE stage"
          icon={UserCheck}
          color="purple"
        />
        <KpiCard
          title="Avg Time to Convert"
          value="Coming Soon"
          subValue="To be implemented"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Funnel Visualization Placeholder - T3-02 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Funnel Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div id="funnel-chart-container" className="min-h-[300px]">
            {/* FunnelChart component will be added by T3-02 */}
            <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Funnel Visualization</p>
                <p className="text-sm">
                  Chart component will be added in T3-02
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table Placeholder - T3-03 */}
      <Card>
        <CardHeader>
          <CardTitle>Users by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div id="users-table-container" className="min-h-[300px]">
            {/* UsersTable component will be added by T3-03 */}
            <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Users Table</p>
                <p className="text-sm">
                  Table component will be added in T3-03
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
