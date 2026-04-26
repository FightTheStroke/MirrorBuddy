"use client";

import { Coins } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DailyChart } from "./daily-chart";
import type { TokenUsageData } from "../types";
import { useTranslations } from "next-intl";

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function TokenUsageCard({ data }: { data: TokenUsageData | null }) {
  const t = useTranslations("admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Coins className="h-4 w-4 text-indigo-500" />
          {t("tokenUsage")}
        </CardTitle>
        <CardDescription className="text-xs">
          {t("aiApiTokenConsumptionBreakdown")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.byAction &&
          Object.entries(data.byAction).map(([action, stats]) => (
            <div
              key={action}
              className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <div>
                <p className="font-medium text-xs text-slate-900 dark:text-white">
                  {action}
                </p>
                <p className="text-[10px] text-slate-500">
                  {stats.count} {t("calls")}
                </p>
              </div>
              <p className="font-mono text-xs">
                {formatNumber(stats.totalTokens)} {t("tokens")}
              </p>
            </div>
          ))}
        {data?.dailyUsage && (
          <DailyChart data={data.dailyUsage} label="Daily Token Usage" />
        )}
      </CardContent>
    </Card>
  );
}
