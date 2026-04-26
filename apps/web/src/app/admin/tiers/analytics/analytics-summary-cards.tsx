import { Users, MessageSquare, Activity, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AnalyticsSummaryCardsProps {
  totals: {
    totalUsers: number;
    activeUsers: number;
    totalMessages: number;
  };
  avgMessagesOverall: number;
  t: (key: string) => string;
}

export function AnalyticsSummaryCards({
  totals,
  avgMessagesOverall,
  t,
}: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("totalUsers")}
              </p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {totals.totalUsers}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("allPlans")}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("activeUsers")}
              </p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {totals.activeUsers}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("lastDays")}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("totalMessages")}
              </p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {totals.totalMessages.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("allConversations")}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                {t("averagePerUser")}
              </p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {avgMessagesOverall}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("messagesPerUser")}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <Layers className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
