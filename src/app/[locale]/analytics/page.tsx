"use client";

/**
 * Student Analytics Dashboard
 *
 * Shows learning patterns, strengths, weaknesses, and AI-powered recommendations
 * Pro tier only feature
 *
 * Plan 104 - Wave 4: Pro Features [T4-06]
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Target,
  Lightbulb,
  Brain,
  Lock,
} from "lucide-react";
import { useTierFeatures } from "@/hooks/useTierFeatures";
import { AnalyticsScoreCard } from "./components/analytics-score-card";
import { AnalyticsListCard } from "./components/analytics-list-card";
import type { LearningRecommendation } from "@/lib/education/server";

export default function StudentAnalyticsPage() {
  const t = useTranslations("analytics");
  const { tier, isSimulated } = useTierFeatures();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LearningRecommendation | null>(null);

  const isPro = tier === "pro" || isSimulated;

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const response = await fetch("/api/analytics/student-insights");

        if (response.status === 403) {
          setError(t("proOnly"));
          setData(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (isPro) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isPro, fetchData]);

  // Pro tier gate
  if (!isPro) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <Lock className="h-12 w-12 text-amber-600 dark:text-amber-400" />
              <div>
                <h2 className="text-xl font-semibold mb-2">{t("proOnly")}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {t("upgradeToPro")}
                </p>
                <Button variant="default" asChild>
                  <Link href="/settings/subscription">Upgrade to Pro</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">{t("loading")}</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || (data.strengths.length === 0 && data.weaknesses.length === 0)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-semibold mb-2">{t("noData")}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("description")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("description")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {t("refresh")}
        </Button>
      </div>

      {/* Overall Score */}
      <AnalyticsScoreCard
        score={data.overallScore}
        confidenceLevel={data.confidenceLevel}
      />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnalyticsListCard
          title={t("strengths.title")}
          description={t("strengths.description")}
          emptyMessage={t("strengths.empty")}
          items={data.strengths}
          icon={Target}
          iconColor="text-green-600 dark:text-green-400"
          bulletSymbol="✓"
          bulletColor="text-green-500"
        />

        <AnalyticsListCard
          title={t("weaknesses.title")}
          description={t("weaknesses.description")}
          emptyMessage={t("weaknesses.empty")}
          items={data.weaknesses}
          icon={AlertCircle}
          iconColor="text-amber-600 dark:text-amber-400"
          bulletSymbol="⚠"
          bulletColor="text-amber-500"
        />

        <AnalyticsListCard
          title={t("recommendedTopics.title")}
          description={t("recommendedTopics.description")}
          emptyMessage={t("recommendedTopics.empty")}
          items={data.recommendedTopics}
          icon={Brain}
          iconColor="text-blue-600 dark:text-blue-400"
          bulletSymbol="→"
          bulletColor="text-blue-500"
        />

        <AnalyticsListCard
          title={t("focusAreas.title")}
          description={t("focusAreas.description")}
          emptyMessage={t("focusAreas.empty")}
          items={data.focusAreas}
          icon={Lightbulb}
          iconColor="text-purple-600 dark:text-purple-400"
          bulletSymbol="●"
          bulletColor="text-purple-500"
        />
      </div>
    </div>
  );
}
