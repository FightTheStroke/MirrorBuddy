"use client";

import { useTranslations } from "next-intl";
import { UserPlus, Users, Activity, AlertTriangle, Bug } from "lucide-react";
import { KpiCard } from "@/components/admin/kpi-card";

interface AdminCounts {
  pendingInvites: number;
  totalUsers: number;
  activeUsers24h: number;
  systemAlerts: number;
}

interface DashboardKpiGridProps {
  counts: AdminCounts;
  sentryErrorCount: number;
}

const SENTRY_ISSUES_URL =
  "https://fightthestroke.sentry.io/issues/?query=is%3Aunresolved";

export function DashboardKpiGrid({
  counts,
  sentryErrorCount,
}: DashboardKpiGridProps) {
  const t = useTranslations("admin.dashboard");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard
        title={t("betaRequests")}
        value={counts.pendingInvites}
        subValue={t("pendingApproval")}
        icon={UserPlus}
        href="/admin/invites"
        badge={counts.pendingInvites}
        badgeColor="amber"
        color="purple"
      />
      <KpiCard
        title={t("totalUsers")}
        value={counts.totalUsers}
        subValue={t("registeredUsers")}
        icon={Users}
        href="/admin/users"
        color="blue"
      />
      <KpiCard
        title={t("activeUsers")}
        value={counts.activeUsers24h}
        subValue={t("last24h")}
        icon={Activity}
        href="/admin/analytics"
        color="green"
      />
      <KpiCard
        title={t("systemAlerts")}
        value={counts.systemAlerts}
        subValue={t("unresolvedCritical")}
        icon={AlertTriangle}
        badge={counts.systemAlerts}
        badgeColor={counts.systemAlerts ? "red" : "green"}
        color={counts.systemAlerts ? "red" : "green"}
      />
      <KpiCard
        title={t("sentryErrors")}
        value={sentryErrorCount}
        subValue={t("unresolved")}
        icon={Bug}
        href={SENTRY_ISSUES_URL}
        badge={sentryErrorCount}
        badgeColor={sentryErrorCount > 0 ? "red" : "green"}
        color={sentryErrorCount > 0 ? "orange" : "green"}
        external
      />
    </div>
  );
}
