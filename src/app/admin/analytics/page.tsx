"use client";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Euro,
  Activity,
  Mic,
  Brain,
  ShieldAlert,
} from "lucide-react";
import { StatCard } from "./components/stat-card";
import { SessionCostCard } from "./components/session-cost-card";
import { TokenUsageCard } from "./components/token-usage-card";
import { VoiceMetricsCard } from "./components/voice-metrics-card";
import { FsrsStatsCard } from "./components/fsrs-stats-card";
import { SafetyEventsCard } from "./components/safety-events-card";
import { ExternalServicesCard } from "./components/external-services-card";
import { A11yStatsWidget } from "./components/a11y-stats-widget";
import { ResetStatsButton } from "./components/reset-stats-button";
import type {
  TokenUsageData,
  VoiceMetricsData,
  FsrsStatsData,
  SafetyEventsData,
  SessionMetricsData,
  ExternalServicesData,
} from "./types";
import type { A11yStatsData } from "@/app/api/dashboard/a11y-stats/route";

type DashboardData = {
  tokenUsage: TokenUsageData | null;
  voiceMetrics: VoiceMetricsData | null;
  fsrsStats: FsrsStatsData | null;
  safetyEvents: SafetyEventsData | null;
  sessionMetrics: SessionMetricsData | null;
  externalServices: ExternalServicesData | null;
  a11yStats: A11yStatsData | null;
};

const INITIAL_DATA: DashboardData = {
  tokenUsage: null,
  voiceMetrics: null,
  fsrsStats: null,
  safetyEvents: null,
  sessionMetrics: null,
  externalServices: null,
  a11yStats: null,
};

export default function AdminAnalyticsPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const urls = [
        "/api/dashboard/token-usage?days=7",
        "/api/dashboard/voice-metrics?days=7",
        "/api/dashboard/fsrs-stats?days=7",
        "/api/dashboard/safety-events?days=7",
        "/api/dashboard/session-metrics?days=7",
        "/api/dashboard/external-services",
        "/api/dashboard/a11y-stats?days=7",
      ];
      const responses = await Promise.all(urls.map((u) => fetch(u)));
      const parsed = await Promise.all(
        responses.map((r) => (r.ok ? r.json() : null)),
      );
      setData({
        tokenUsage: parsed[0],
        voiceMetrics: parsed[1],
        fsrsStats: parsed[2],
        safetyEvents: parsed[3],
        sessionMetrics: parsed[4],
        externalServices: parsed[5],
        a11yStats: parsed[6],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch dashboard data",
      );
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Last 7 days</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <ResetStatsButton />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Session Cost"
          value={`\u20AC${data.sessionMetrics?.cost.totalEur.toFixed(2) ?? "0.00"}`}
          subValue={`\u20AC${data.sessionMetrics?.cost.avgPerSession.toFixed(3) ?? "0.000"} avg`}
          icon={Euro}
          color="green"
        />
        <StatCard
          title="Total Sessions"
          value={data.sessionMetrics?.summary.totalSessions ?? 0}
          subValue={`${data.sessionMetrics?.summary.avgTurnsPerSession ?? 0} avg turns`}
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title="Voice Minutes"
          value={data.sessionMetrics?.cost.voiceMinutes?.toFixed(1) ?? "0"}
          subValue={`\u20AC${((data.sessionMetrics?.cost.voiceMinutes ?? 0) * (data.sessionMetrics?.cost.pricing.voicePerMin ?? 0.04)).toFixed(2)} cost`}
          icon={Mic}
          color="green"
        />
        <StatCard
          title="Flashcard Reviews"
          value={data.fsrsStats?.summary.totalReviews ?? 0}
          subValue={`${data.fsrsStats?.summary.accuracy ?? 0}% accuracy`}
          icon={Brain}
          color="blue"
        />
        <StatCard
          title="Safety Refusals"
          value={data.sessionMetrics?.safety.totalRefusals ?? 0}
          subValue={`${data.sessionMetrics?.safety.refusalAccuracy ?? 100}% correct`}
          icon={ShieldAlert}
          color="amber"
        />
      </div>

      {(data.safetyEvents?.summary.unresolvedCount ?? 0) > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <p className="font-medium text-sm text-red-900 dark:text-red-100">
                  {data.safetyEvents?.summary.unresolvedCount} Unresolved Safety
                  Events
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {data.safetyEvents?.summary.criticalCount ?? 0} critical
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SessionCostCard data={data.sessionMetrics} />
        <TokenUsageCard data={data.tokenUsage} />
        <VoiceMetricsCard data={data.voiceMetrics} />
        <FsrsStatsCard data={data.fsrsStats} />
        <SafetyEventsCard data={data.safetyEvents} />
        <ExternalServicesCard data={data.externalServices} />
        <A11yStatsWidget data={data.a11yStats} />
      </div>
    </div>
  );
}
