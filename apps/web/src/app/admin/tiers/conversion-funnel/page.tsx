"use client";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

/**
 * Admin Tier Conversion Funnel Dashboard
 * Visualizes Trial → Base → Pro conversion metrics
 */

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { FunnelLoadingState } from "./funnel-loading-state";
import { FunnelErrorState } from "./funnel-error-state";
import { FunnelSummaryCards } from "./funnel-summary-cards";
import { FunnelVisualization } from "./funnel-visualization";
import { FunnelMetricsCard } from "./funnel-metrics-card";

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
  const t = useTranslations("admin.tiers.conversionFunnel");
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
    return <FunnelLoadingState />;
  }

  if (error) {
    return <FunnelErrorState error={error} />;
  }

  if (!data) return null;

  const { stages, summary } = data;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/admin/tiers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToTiers")}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("period", { start: summary.periodStart, end: summary.periodEnd })}
        </p>
      </div>

      {/* Summary Cards */}
      <FunnelSummaryCards summary={summary} />

      {/* Funnel Visualization */}
      <FunnelVisualization stages={stages} />

      {/* Additional Metrics */}
      <FunnelMetricsCard summary={summary} />
    </div>
  );
}
