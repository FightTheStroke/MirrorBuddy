"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ZapOff, Shield } from "lucide-react";
import type { SafetyDashboardResponse } from "@/app/api/admin/safety/route";
import { useTranslations } from "next-intl";

interface SafetyStatisticsProps {
  statistics: SafetyDashboardResponse["statistics"];
}

export function SafetyStatistics({ statistics }: SafetyStatisticsProps) {
  const t = useTranslations("admin");
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Mitigation Effectiveness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ZapOff className="h-5 w-5" />
            {t("mitigationEffectiveness")}
          </CardTitle>
          <CardDescription>{t("outcomesOfDetectedSafetyEvents")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">{t("blocked")}</span>
              </div>
              <span className="font-mono font-bold">
                {statistics.mitigationMetrics.blockedCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm text-muted-foreground">{t("modified")}</span>
              </div>
              <span className="font-mono font-bold">
                {statistics.mitigationMetrics.modifiedCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm text-muted-foreground">{t("escalated")}</span>
              </div>
              <span className="font-mono font-bold">
                {statistics.mitigationMetrics.escalatedCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-muted-foreground">{t("monitored")}</span>
              </div>
              <span className="font-mono font-bold">
                {statistics.mitigationMetrics.monitoredCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">{t("allowed")}</span>
              </div>
              <span className="font-mono font-bold">
                {statistics.mitigationMetrics.allowedCount}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("regulatoryFrameworkImpact")}
          </CardTitle>
          <CardDescription>
            {t("complianceCoverageAcrossRegulations")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {t("euAiAct")}
              </span>
              <span className="font-mono font-bold">
                {statistics.regulatoryImpact.aiActEvents}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                GDPR
              </span>
              <span className="font-mono font-bold">
                {statistics.regulatoryImpact.gdprEvents}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                COPPA
              </span>
              <span className="font-mono font-bold">
                {statistics.regulatoryImpact.coppaEvents}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {t("italianL132Art4")}
              </span>
              <span className="font-mono font-bold">
                {statistics.regulatoryImpact.italianL132Art4Events}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
