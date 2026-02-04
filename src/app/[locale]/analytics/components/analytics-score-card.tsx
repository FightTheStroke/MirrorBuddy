/**
 * Overall Score Card Component
 * Displays student overall learning score with color-coded rating
 */

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface AnalyticsScoreCardProps {
  score: number;
  confidenceLevel: "low" | "medium" | "high";
}

export function AnalyticsScoreCard({
  score,
  confidenceLevel,
}: AnalyticsScoreCardProps) {
  const t = useTranslations("analytics");

  const getScoreColor = (s: number): string => {
    if (s >= 80) return "text-green-600 dark:text-green-400";
    if (s >= 60) return "text-blue-600 dark:text-blue-400";
    if (s >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreLabel = (s: number): string => {
    if (s >= 80) return t("overallScore.excellent");
    if (s >= 60) return t("overallScore.good");
    if (s >= 40) return t("overallScore.fair");
    return t("overallScore.needsWork");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t("overallScore.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <div>
            <p className="text-lg font-medium">{getScoreLabel(score)}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("overallScore.description")}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {t("confidenceLevel.title")}:{" "}
              {t(`confidenceLevel.${confidenceLevel}`)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
