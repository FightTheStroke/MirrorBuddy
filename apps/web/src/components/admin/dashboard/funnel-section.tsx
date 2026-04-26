"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { FunnelChart } from "@/components/admin/funnel-chart";
import { FunnelUsersTable } from "@/components/admin/funnel-users-table";
import { UserDrilldownModal } from "@/components/admin/user-drill-down-modal";

interface StageMetrics {
  stage: string;
  count: number;
  conversionRate: number | null;
  avgTimeFromPrevious: number | null;
}

interface FunnelMetricsResponse {
  stages: StageMetrics[];
  totals: {
    uniqueVisitors: number;
    uniqueConverted: number;
    overallConversionRate: number;
  };
  period: { start: string; end: string };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-xl font-semibold text-slate-900 dark:text-white mt-0.5">
        {value}
      </p>
    </div>
  );
}

export function FunnelSection() {
  const t = useTranslations("admin.dashboard");
  const [metrics, setMetrics] = useState<FunnelMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/admin/funnel/metrics?days=30");
        if (!res.ok) throw new Error("Failed to fetch funnel metrics");
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
      <div className="flex items-center justify-center py-12">
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

  if (!metrics) {
    return (
      <p className="text-center text-slate-500 py-8">{t("noFunnelData")}</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label={t("uniqueVisitors")}
          value={metrics.totals.uniqueVisitors.toLocaleString()}
        />
        <StatCard
          label={t("convertedUsers")}
          value={metrics.totals.uniqueConverted.toLocaleString()}
        />
        <StatCard
          label={t("overallConversion")}
          value={`${metrics.totals.overallConversionRate.toFixed(1)}%`}
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          {t("conversionFunnel")}
        </h3>
        <FunnelChart stages={metrics.stages} />
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          {t("userDetails")}
        </h3>
        <FunnelUsersTable onSelectUser={setSelectedUserId} />
      </div>

      <UserDrilldownModal
        userId={selectedUserId}
        open={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}
