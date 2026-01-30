/**
 * Revenue metrics card component
 */

import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RevenueMetrics } from "@/lib/admin/business-kpi-types";

interface RevenueCardProps {
  revenue: RevenueMetrics;
}

export function RevenueCard({ revenue }: RevenueCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: revenue.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isPositiveGrowth = revenue.growthRate >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Revenue</CardTitle>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardDescription>Monthly and annual recurring revenue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">MRR</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(revenue.mrr)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Monthly recurring
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">ARR</div>
            <div className="text-2xl font-bold mt-1">
              {formatCurrency(revenue.arr)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Annual recurring
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Growth Rate
            </div>
            <div
              className={`flex items-center gap-1 text-sm font-medium ${
                isPositiveGrowth ? "text-green-600" : "text-red-600"
              }`}
            >
              <span>
                {isPositiveGrowth ? "+" : ""}
                {revenue.growthRate.toFixed(1)}%
              </span>
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </div>
            <div className="text-lg font-bold">
              {formatCurrency(revenue.totalRevenue)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            All-time revenue
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
