/**
 * User metrics card component
 */

import { Users, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserMetrics } from "@/lib/admin/business-kpi-types";

interface UsersCardProps {
  users: UserMetrics;
}

export function UsersCard({ users }: UsersCardProps) {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("it-IT").format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const activeRate =
    users.totalUsers > 0 ? (users.activeUsers / users.totalUsers) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Users</CardTitle>
          <div className="flex items-center gap-2">
            {users.isEstimated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Estimated
              </span>
            )}
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        <CardDescription>User base and engagement metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Total Users
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatNumber(users.totalUsers)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              All registered
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Active Users
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatNumber(users.activeUsers)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active Rate</span>
            <span className="font-medium">{formatPercentage(activeRate)}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${Math.min(activeRate, 100)}%` }}
            />
          </div>
        </div>

        <div className="pt-4 border-t grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Trial Users
            </div>
            <div className="text-lg font-bold mt-1">
              {formatNumber(users.trialUsers)}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Paid Users
            </div>
            <div className="text-lg font-bold mt-1">
              {formatNumber(users.paidUsers)}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Churn Rate
            </div>
            {users.churnRate === null ? (
              <div
                className="text-sm font-medium text-muted-foreground"
                title="Insufficient historical data"
              >
                N/A
              </div>
            ) : (
              <div className="text-sm font-medium text-red-600">
                {formatPercentage(users.churnRate)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Trial Conversion
            </div>
            <div className="text-sm font-medium text-green-600">
              {formatPercentage(users.trialConversionRate)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
