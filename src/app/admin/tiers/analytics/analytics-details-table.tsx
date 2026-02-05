import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TierAnalytics {
  tierId: string;
  tierCode: string;
  tierName: string;
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  avgMessagesPerUser: number;
  isActive: boolean;
}

interface AnalyticsDetailsTableProps {
  analytics: TierAnalytics[];
  t: (key: string) => string;
}

export function AnalyticsDetailsTable({
  analytics,
  t,
}: AnalyticsDetailsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("details")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("plan")}</TableHead>
                <TableHead>{t("code")}</TableHead>
                <TableHead className="text-right">
                  {t("totalUsersCol")}
                </TableHead>
                <TableHead className="text-right">
                  {t("activeUsersCol")}
                </TableHead>
                <TableHead className="text-right">
                  {t("totalMessagesCol")}
                </TableHead>
                <TableHead className="text-right">{t("averageCol")}</TableHead>
                <TableHead className="text-right">
                  {t("activityRate")}
                </TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.map((tier) => {
                const activityRate =
                  tier.totalUsers > 0
                    ? Math.round((tier.activeUsers / tier.totalUsers) * 100)
                    : 0;

                return (
                  <TableRow key={tier.tierId}>
                    <TableCell className="font-medium">
                      {tier.tierName}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {tier.tierCode}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {tier.totalUsers}
                    </TableCell>
                    <TableCell className="text-right">
                      {tier.activeUsers}
                    </TableCell>
                    <TableCell className="text-right">
                      {tier.totalMessages.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {tier.avgMessagesPerUser}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          activityRate >= 70
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : activityRate >= 40
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {activityRate}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          tier.isActive
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {tier.isActive ? t("active") : t("inactive")}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {analytics.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t("noPlans")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
