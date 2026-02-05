import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface FunnelMetricsCardProps {
  summary: {
    trialToBaseRate: number;
    baseToProRate: number;
    trialToProRate: number;
  };
}

export function FunnelMetricsCard({ summary }: FunnelMetricsCardProps) {
  const t = useTranslations("admin.tiers.conversionFunnel");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("keyMetrics")}</CardTitle>
        <CardDescription>{t("detailedAnalysis")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <p className="text-xs text-muted-foreground">{t("trialToBase")}</p>
            <p className="text-xl font-bold mt-1">
              {summary.trialToBaseRate.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              {t("baseToProRate")}
            </p>
            <p className="text-xl font-bold mt-1">
              {summary.baseToProRate.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
            <p className="text-xs text-muted-foreground">{t("trialToPro")}</p>
            <p className="text-xl font-bold mt-1">
              {summary.trialToProRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
