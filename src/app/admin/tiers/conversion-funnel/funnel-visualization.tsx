import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface FunnelStage {
  tierCode: string;
  tierName: string;
  totalUsers: number;
  nextStageConversions: number | null;
  conversionRate: number | null;
}

interface FunnelVisualizationProps {
  stages: FunnelStage[];
}

export function FunnelVisualization({ stages }: FunnelVisualizationProps) {
  const t = useTranslations("admin.tiers.conversionFunnel");
  const maxUsers = Math.max(...stages.map((s) => s.totalUsers || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {stages.map((stage, index) => (
          <div key={stage.tierCode} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">
                  {stage.tierName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("users", { count: stage.totalUsers })}
                </p>
              </div>
              {stage.conversionRate !== null && (
                <div className="text-right">
                  <p className="font-bold text-foreground">
                    {stage.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("conversions", {
                      count: stage.nextStageConversions || 0,
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Funnel bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded overflow-hidden h-10">
              <div
                className={`h-full flex items-center justify-start px-3 transition-all ${
                  index === 0
                    ? "bg-blue-500"
                    : index === 1
                      ? "bg-purple-500"
                      : "bg-green-500"
                }`}
                style={{
                  width: `${maxUsers > 0 ? (stage.totalUsers / maxUsers) * 100 : 0}%`,
                }}
              >
                <span className="text-white text-sm font-semibold">
                  {stage.totalUsers > 0 ? stage.totalUsers : ""}
                </span>
              </div>
            </div>

            {/* Conversion arrow */}
            {index < stages.length - 1 && (
              <div className="flex justify-center py-2">
                <svg
                  className="w-6 h-6 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m0 0l4 4m10-4v12m0 0l4-4m0 0l-4-4"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
