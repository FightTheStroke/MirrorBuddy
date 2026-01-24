/**
 * Admin Tier Conversion Funnel Dashboard
 * Visualizes Trial → Base → Pro conversion metrics
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Users } from "lucide-react";

interface FunnelStage {
  tierCode: string;
  tierName: string;
  totalUsers: number;
  nextStageConversions: number | null;
  conversionRate: number | null;
}

interface ConversionFunnelData {
  stages: FunnelStage[];
  summary: {
    trialToBaseRate: number;
    baseToProRate: number;
    trialToProRate: number;
    funnelEfficiency: number;
    totalUsersTracked: number;
    periodStart: string;
    periodEnd: string;
  };
  timeSeries: Array<{
    date: string;
    trialCount: number;
    baseCount: number;
    proCount: number;
    conversionsTrialToBase: number;
    conversionsBaseToProCount: number;
  }>;
}

export default function ConversionFunnelPage() {
  const [data, setData] = useState<ConversionFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/tiers/conversion-funnel?days=30");
        if (!res.ok) throw new Error("Failed to fetch funnel data");
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 bg-slate-200 dark:bg-slate-700 rounded"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stages, summary } = data;

  // Calculate max width for funnel visualization
  const maxUsers = Math.max(...stages.map((s) => s.totalUsers || 0));

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/admin/tiers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tiers
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">
          Tier Conversion Funnel
        </h1>
        <p className="text-sm text-muted-foreground">
          {summary.periodStart} to {summary.periodEnd}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Trial → Base
                </p>
                <p className="text-3xl font-bold mt-2 text-foreground">
                  {summary.trialToBaseRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Conversion rate
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Base → Pro
                </p>
                <p className="text-3xl font-bold mt-2 text-foreground">
                  {summary.baseToProRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Conversion rate
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Funnel Efficiency
                </p>
                <p className="text-3xl font-bold mt-2 text-foreground">
                  {summary.funnelEfficiency.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Base → Pro conversion
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Tracked
                </p>
                <p className="text-3xl font-bold mt-2 text-foreground">
                  {summary.totalUsersTracked}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Trial users
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>
            User progression through tier stages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {stages.map((stage, index) => (
            <div key={stage.tierCode} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {stage.tierName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {stage.totalUsers} users
                  </p>
                </div>
                {stage.conversionRate !== null && (
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {stage.conversionRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      → {stage.nextStageConversions} conversions
                    </p>
                  </div>
                )}
              </div>

              {/* Funnel bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded overflow-hidden h-10">
                <div
                  className={`h-full flex items-center justify-start px-3 transition-all ${
                    index === 0
                      ? "bg-blue-500"
                      : index === 1
                        ? "bg-purple-500"
                        : "bg-green-500"
                  }`}
                  style={{
                    width: `${maxUsers > 0 ? (stage.totalUsers / maxUsers) * 100 : 0}%`,
                  }}
                >
                  <span className="text-white text-sm font-semibold">
                    {stage.totalUsers > 0 ? stage.totalUsers : ""}
                  </span>
                </div>
              </div>

              {/* Conversion arrow */}
              {index < stages.length - 1 && (
                <div className="flex justify-center py-2">
                  <svg
                    className="w-6 h-6 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m0 0l4 4m10-4v12m0 0l4-4m0 0l-4-4"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
          <CardDescription>Detailed conversion analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Trial → Base</p>
              <p className="text-xl font-bold mt-1">
                {summary.trialToBaseRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Base → Pro</p>
              <p className="text-xl font-bold mt-1">
                {summary.baseToProRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Trial → Pro (Direct)
              </p>
              <p className="text-xl font-bold mt-1">
                {summary.trialToProRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
