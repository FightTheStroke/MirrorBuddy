/**
 * Analytics Dashboard Component
 * Professional dashboard with study time, sessions per maestro,
 * token usage, Azure costs, and learning trends
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { logger } from "@/lib/logger";
import { motion } from "framer-motion";
import {
  Clock,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Activity,
  DollarSign,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProgressStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { maestri, subjectColors } from "@/data";
import type { Subject } from "@/types";
import {
  StatCard,
  StudyTrendChart,
  CostTrendChart,
  formatMinutes,
} from "./analytics-charts";

type TimePeriod = "today" | "week" | "month" | "season";

interface TokenUsageData {
  summary: {
    totalTokens: number;
    totalCalls: number;
    avgTokensPerCall: number;
    estimatedCostUsd: number;
  };
  byAction: Record<string, { count: number; totalTokens: number }>;
  dailyUsage: Record<string, number>;
}

interface AzureCostData {
  totalCost: number;
  currency: string;
  costsByService: Array<{ serviceName: string; cost: number }>;
  dailyCosts: Array<{ date: string; cost: number }>;
  configured?: boolean;
}

export function AnalyticsDashboard() {
  const t = useTranslations("dashboard");
  const [period, setPeriod] = useState<TimePeriod>("week");
  const [tokenData, setTokenData] = useState<TokenUsageData | null>(null);
  const [azureCosts, setAzureCosts] = useState<AzureCostData | null>(null);
  const [loading, setLoading] = useState(false);

  const { sessionHistory, totalStudyMinutes, currentSeason } =
    useProgressStore();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const days =
        period === "today"
          ? 1
          : period === "week"
            ? 7
            : period === "month"
              ? 30
              : 90;
      const [tokenRes, costRes] = await Promise.all([
        fetch(`/api/dashboard/token-usage?days=${days}`).catch(() => null),
        fetch(`/api/azure/costs?days=${days}`).catch(() => null),
      ]);
      if (tokenRes?.ok) setTokenData(await tokenRes.json());
      if (costRes?.ok) {
        setAzureCosts(await costRes.json());
      } else if (costRes?.status === 503) {
        const data = await costRes.json();
        setAzureCosts({
          ...data,
          configured: false,
          totalCost: 0,
          currency: "USD",
          costsByService: [],
          dailyCosts: [],
        });
      }
    } catch (error) {
      logger.error("Failed to fetch analytics", { error: String(error) });
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const studyStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(
      todayStart.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    const seasonStart = currentSeason?.startDate
      ? new Date(currentSeason.startDate)
      : monthStart;

    const filterByPeriod = (start: Date) =>
      sessionHistory.filter((s) => new Date(s.startedAt) >= start);
    const sumMinutes = (sessions: typeof sessionHistory) =>
      sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

    return {
      today: sumMinutes(filterByPeriod(todayStart)),
      week: sumMinutes(filterByPeriod(weekStart)),
      month: sumMinutes(filterByPeriod(monthStart)),
      season: sumMinutes(filterByPeriod(seasonStart)),
      total: totalStudyMinutes,
    };
  }, [sessionHistory, totalStudyMinutes, currentSeason]);

  const sessionsByMaestro = useMemo(() => {
    const counts: Record<
      string,
      { count: number; minutes: number; subject: string }
    > = {};
    for (const session of sessionHistory) {
      if (!session.maestroId) continue;
      if (!counts[session.maestroId]) {
        const maestro = maestri.find((m) => m.id === session.maestroId);
        counts[session.maestroId] = {
          count: 0,
          minutes: 0,
          subject: maestro?.subject || "unknown",
        };
      }
      counts[session.maestroId].count++;
      counts[session.maestroId].minutes += session.durationMinutes || 0;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);
  }, [sessionHistory]);

  const periodLabel = {
    today: t("periods.today"),
    week: t("periods.week"),
    month: t("periods.month"),
    season: t("periods.season"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Analytics Dashboard
          </h2>
          <p className="text-sm text-slate-500">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            {(["today", "week", "month", "season"] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  period === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {periodLabel[p]}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label={t("studyTime")}
          value={formatMinutes(studyStats[period])}
          subtext={`${t("total")}: ${formatMinutes(studyStats.total)}`}
          color="blue"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label={t("sessions")}
          value={sessionHistory.length.toString()}
          subtext={`${sessionsByMaestro.length} ${t("maestriUsed")}`}
          color="purple"
        />
        <StatCard
          icon={<Cpu className="w-5 h-5" />}
          label={t("tokenAI")}
          value={tokenData?.summary.totalTokens.toLocaleString() || "0"}
          subtext={`${tokenData?.summary.totalCalls || 0} ${t("calls")}`}
          color="green"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label={t("estimatedCost")}
          value={
            azureCosts?.configured === false
              ? "N/D"
              : `$${(azureCosts?.totalCost || 0).toFixed(2)}`
          }
          subtext={
            azureCosts?.configured === false ? t("notConfigured") : "Azure + AI"
          }
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              {t("sessionsByMaestro")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionsByMaestro.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noSessions")}
              </p>
            ) : (
              sessionsByMaestro.map(([id, data]) => {
                const maestro = maestri.find((m) => m.id === id);
                const maxCount = Math.max(
                  ...sessionsByMaestro.map(([, d]) => d.count),
                );
                return (
                  <div key={id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{maestro?.name || id}</span>
                      <span className="text-muted-foreground">
                        {data.count}{" "}
                        {data.count === 1
                          ? t("sessionSingular")
                          : t("sessionPlural")}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor:
                            subjectColors[data.subject as Subject] || "#6366f1",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(data.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-green-500" />
              {t("tokenUsageByType")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!tokenData || Object.keys(tokenData.byAction).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noDataAvailable")}
              </p>
            ) : (
              Object.entries(tokenData.byAction).map(([action, data]) => {
                const maxTokens = Math.max(
                  ...Object.values(tokenData.byAction).map(
                    (d) => d.totalTokens,
                  ),
                );
                const label = action
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <div key={action} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">
                        {data.totalTokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-green-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(data.totalTokens / maxTokens) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              {t("studyTrend")} ({periodLabel[period]})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StudyTrendChart sessionHistory={sessionHistory} period={period} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-amber-500" />
              {t("dailyCosts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {azureCosts?.configured === false ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("azureNotConfigured")}</p>
                <p className="text-xs mt-1">{t("configureAzure")}</p>
              </div>
            ) : azureCosts?.dailyCosts.length ? (
              <CostTrendChart dailyCosts={azureCosts.dailyCosts} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("noCostData")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
