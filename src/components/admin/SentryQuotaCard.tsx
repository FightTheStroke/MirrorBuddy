/**
 * Sentry Quota Card
 *
 * Displays Sentry usage stats and free tier limits in admin dashboard.
 * Shows events consumed, limit, and recommendation when approaching quota.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface SentryStats {
  eventsConsumed: number;
  eventsLimit: number;
  percentUsed: number;
  periodStart: string;
  periodEnd: string;
  isFreeTier: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  recommendation: string | null;
  error?: string;
}

interface SentryQuotaCardProps {
  refreshInterval?: number;
}

export function SentryQuotaCard({
  refreshInterval = 300000,
}: SentryQuotaCardProps) {
  const [stats, setStats] = useState<SentryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);

    try {
      const response = await fetch("/api/admin/sentry/stats");
      if (!response.ok) throw new Error("Failed to fetch Sentry stats");
      const data = await response.json();
      setStats(data);
    } catch {
      setStats({
        eventsConsumed: 0,
        eventsLimit: 5000,
        percentUsed: 0,
        periodStart: "",
        periodEnd: "",
        isFreeTier: true,
        warningThreshold: 80,
        criticalThreshold: 95,
        recommendation: "Unable to fetch stats",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(), refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStats, refreshInterval]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-2 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const getStatusColor = () => {
    if (stats.percentUsed >= stats.criticalThreshold) return "red";
    if (stats.percentUsed >= stats.warningThreshold) return "amber";
    return "green";
  };

  const statusColor = getStatusColor();

  const colorClasses = {
    red: {
      bg: "bg-red-500",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-800",
      bgLight: "bg-red-50 dark:bg-red-900/20",
    },
    amber: {
      bg: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
      bgLight: "bg-amber-50 dark:bg-amber-900/20",
    },
    green: {
      bg: "bg-green-500",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-800",
      bgLight: "bg-green-50 dark:bg-green-900/20",
    },
  };

  const colors = colorClasses[statusColor];

  return (
    <Card className={cn("border", colors.border)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className={cn("h-4 w-4", colors.text)} />
          Sentry Quota
          {stats.isFreeTier && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
              Free
            </span>
          )}
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("h-3 w-3", isRefreshing && "animate-spin")}
            />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <a
              href="https://sentry.io/settings/fightthestroke/billing/overview/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Usage Display */}
        <div className="flex items-baseline justify-between">
          <span className={cn("text-2xl font-bold", colors.text)}>
            {stats.eventsConsumed.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            / {stats.eventsLimit.toLocaleString()} eventi
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all", colors.bg)}
            style={{ width: `${Math.min(stats.percentUsed, 100)}%` }}
          />
        </div>

        {/* Percentage */}
        <div className="flex items-center justify-between text-xs">
          <span className={colors.text}>{stats.percentUsed}% utilizzato</span>
          <span className="text-muted-foreground">
            {(stats.eventsLimit - stats.eventsConsumed).toLocaleString()}{" "}
            rimanenti
          </span>
        </div>

        {/* Recommendation */}
        {stats.recommendation && (
          <div
            className={cn(
              "flex items-start gap-2 p-2 rounded text-xs",
              colors.bgLight,
            )}
          >
            <AlertTriangle
              className={cn("h-3 w-3 mt-0.5 shrink-0", colors.text)}
            />
            <span className={colors.text}>{stats.recommendation}</span>
          </div>
        )}

        {/* Free Tier Info */}
        <p className="text-[10px] text-muted-foreground text-center">
          Free tier: 5,000 eventi/mese • Warnings consumano quota
        </p>
      </CardContent>
    </Card>
  );
}

export default SentryQuotaCard;
