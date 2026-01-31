"use client";

import { Euro } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { SessionMetricsData } from "../types";

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function SessionCostCard({ data }: { data: SessionMetricsData | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Euro className="h-4 w-4 text-emerald-500" />
          Session Cost Metrics (REAL)
        </CardTitle>
        <CardDescription className="text-xs">
          Actual costs from Azure OpenAI API responses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-emerald-600">
              &euro;{data?.cost.totalEur.toFixed(2) ?? "0.00"}
            </p>
            <p className="text-[10px] text-slate-500">Total Cost</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">
              &euro;{data?.cost.p95PerSession.toFixed(3) ?? "0.000"}
            </p>
            <p className="text-[10px] text-slate-500">P95/Session</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {formatNumber(data?.tokens.total ?? 0)}
            </p>
            <p className="text-[10px] text-slate-500">Total Tokens</p>
          </div>
        </div>
        {data?.outcomes && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">Outcomes</p>
            {Object.entries(data.outcomes).map(([outcome, count]) => (
              <div
                key={outcome}
                className="flex items-center justify-between text-xs"
              >
                <span
                  className={`capitalize ${
                    outcome === "success"
                      ? "text-green-600"
                      : outcome === "dropped"
                        ? "text-amber-600"
                        : outcome === "stuck_loop"
                          ? "text-red-600"
                          : "text-slate-600"
                  }`}
                >
                  {outcome.replace("_", " ")}
                </span>
                <span className="font-mono">{count}</span>
              </div>
            ))}
          </div>
        )}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[10px] text-slate-400">
            &euro;{data?.cost.pricing.textPer1kTokens ?? 0.002}/1K tokens &bull;
            &euro;{data?.cost.pricing.voicePerMin ?? 0.04}/min voice
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
