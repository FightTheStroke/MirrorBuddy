"use client";

import { Brain } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { FsrsStatsData } from "../types";
import { useTranslations } from "next-intl";

export function FsrsStatsCard({ data }: { data: FsrsStatsData | null }) {
  const t = useTranslations("admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4 text-blue-500" />
          {t("flashcardFsrsStats")}
        </CardTitle>
        <CardDescription className="text-xs">
          {t("spacedRepetitionLearningMetrics")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">
              {data?.summary.totalCards ?? 0}
            </p>
            <p className="text-[10px] text-slate-500">{t("totalCards")}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-green-600">
              {data?.summary.accuracy ?? 0}%
            </p>
            <p className="text-[10px] text-slate-500">{t("accuracy")}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-amber-600">
              {data?.summary.cardsDueToday ?? 0}
            </p>
            <p className="text-[10px] text-slate-500">{t("dueToday")}</p>
          </div>
        </div>
        {data?.stateDistribution && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">{t("cardStates")}</p>
            {Object.entries(data.stateDistribution).map(([state, count]) => (
              <div
                key={state}
                className="flex items-center justify-between text-xs"
              >
                <span className="capitalize text-slate-500">{state}</span>
                <span className="font-mono">{count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
