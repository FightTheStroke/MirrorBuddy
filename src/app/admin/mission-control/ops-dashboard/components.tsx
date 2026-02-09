"use client";

/**
 * Ops Dashboard Components
 * UI components for online users and request metrics
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity } from "lucide-react";
import type {
  OnlineUsersMetric,
  RequestMetrics,
} from "@/lib/admin/ops-dashboard-types";
import { useTranslations } from "next-intl";

interface OnlineUsersCardProps {
  metrics: OnlineUsersMetric;
}

export function OnlineUsersCard({ metrics }: OnlineUsersCardProps) {
  const t = useTranslations("admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("onlineUsers")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-4xl font-bold">{metrics.total}</div>

        {/* By Nation */}
        {metrics.byNation.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t("byNation")}
            </h3>
            <div className="space-y-1">
              {metrics.byNation.map((item) => (
                <div
                  key={item.nation}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{item.nation}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Tier */}
        {metrics.byTier.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t("byTier")}
            </h3>
            <div className="space-y-1">
              {metrics.byTier.map((item) => (
                <div
                  key={item.tier}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{item.tier}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics.byNation.length === 0 && metrics.byTier.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noUsersOnline")}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface RequestMetricsCardProps {
  metrics: RequestMetrics;
}

export function RequestMetricsCard({ metrics }: RequestMetricsCardProps) {
  const t = useTranslations("admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t("requestMetrics")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold">{metrics.totalRequests}</div>
            <p className="text-xs text-muted-foreground">{t("totalRequests")}</p>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {metrics.avgResponseTime.toFixed(0)}{t("ms1")}
            </div>
            <p className="text-xs text-muted-foreground">{t("avgResponse")}</p>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {metrics.errorRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">{t("errorRate")}</p>
          </div>
        </div>

        {/* Top Endpoints */}
        {metrics.topEndpoints.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {t("topEndpoints")}
            </h3>
            <div className="space-y-1">
              {metrics.topEndpoints.map((endpoint) => (
                <div
                  key={endpoint.path}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-muted-foreground">
                    {endpoint.path}
                  </span>
                  <div className="flex gap-2">
                    <span className="font-medium">{endpoint.count}</span>
                    <span className="text-muted-foreground">
                      ({endpoint.avgTime.toFixed(0)}{t("ms")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics.topEndpoints.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("noRequestDataAvailable")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
