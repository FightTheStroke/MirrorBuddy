/**
 * Conversion Funnel Dashboard
 * Plan 069 - Complete admin view of user conversion funnel
 */

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/admin/kpi-card";
import { FunnelChart } from "@/components/admin/funnel-chart";
import { ChurnMetrics } from "@/components/admin/churn-metrics";
import { UserJourneyLookup } from "@/components/admin/user-journey-lookup";
import { CohortAnalysis } from "@/components/admin/cohort-analysis";
import { Users, TrendingUp, UserCheck, AlertTriangle } from "lucide-react";

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
        setMetrics(await res.json());
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
      <div className="max-w-7xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg border border-red-200">
          Error: {error}
        </div>
      </div>
    );
  }

  const dropoffRate = metrics ? 100 - metrics.totals.overallConversionRate : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Conversion Funnel
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Last 30 days • Complete user journey analytics
        </p>
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
          subValue="Visitor → Active"
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

      {/* Main Content - 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Funnel Stages</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics && <FunnelChart stages={metrics.stages} />}
          </CardContent>
        </Card>

        {/* User Journey Lookup */}
        <UserJourneyLookup />
      </div>

      {/* Cohort Analysis - Full width */}
      <CohortAnalysis />

      {/* Churn Metrics */}
      <ChurnMetrics />
    </div>
  );
}
