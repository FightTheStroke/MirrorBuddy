import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface FunnelSummaryCardsProps {
  summary: {
    trialToBaseRate: number;
    baseToProRate: number;
    funnelEfficiency: number;
    totalUsersTracked: number;
  };
}

export function FunnelSummaryCards({ summary }: FunnelSummaryCardsProps) {
  const t = useTranslations("admin.tiers.conversionFunnel");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("trialToBase")}
              </p>
              <p className="text-3xl font-bold mt-2 text-foreground">
                {summary.trialToBaseRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("conversionRate")}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("baseToProRate")}
              </p>
              <p className="text-3xl font-bold mt-2 text-foreground">
                {summary.baseToProRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("conversionRate")}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("funnelEfficiency")}
              </p>
              <p className="text-3xl font-bold mt-2 text-foreground">
                {summary.funnelEfficiency.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("baseToProRate")}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("totalTracked")}
              </p>
              <p className="text-3xl font-bold mt-2 text-foreground">
                {summary.totalUsersTracked}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("trialUsers")}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
