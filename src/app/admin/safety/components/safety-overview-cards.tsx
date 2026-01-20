import {
  AlertTriangle,
  Shield,
  Zap,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SafetyDashboardResponse } from "@/app/api/admin/safety/route";

interface SafetyOverviewCardsProps {
  data: SafetyDashboardResponse;
}

interface OverviewCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: "red" | "amber" | "blue" | "green" | "purple";
  trend?: "up" | "down" | "stable";
  subtext?: string;
}

function OverviewCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  subtext,
}: OverviewCardProps) {
  const colorClasses = {
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    amber:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    green:
      "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  };

  const iconBgClasses = {
    red: "bg-red-100 dark:bg-red-800/50",
    amber: "bg-amber-100 dark:bg-amber-800/50",
    blue: "bg-blue-100 dark:bg-blue-800/50",
    green: "bg-green-100 dark:bg-green-800/50",
    purple: "bg-purple-100 dark:bg-purple-800/50",
  };

  return (
    <div className={cn("border rounded-lg p-4 space-y-3", colorClasses[color])}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {title}
        </p>
        <div className={cn("p-2 rounded-lg", iconBgClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </p>
        {trend && (
          <div className="flex items-center gap-1 text-xs font-medium">
            {trend === "up" && (
              <>
                <TrendingUp className="h-4 w-4" />
                <span>Increasing</span>
              </>
            )}
            {trend === "down" && (
              <>
                <TrendingDown className="h-4 w-4" />
                <span>Decreasing</span>
              </>
            )}
            {trend === "stable" && (
              <>
                <Minus className="h-4 w-4" />
                <span>Stable</span>
              </>
            )}
          </div>
        )}
      </div>
      {subtext && (
        <p className="text-xs text-slate-600 dark:text-slate-400">{subtext}</p>
      )}
    </div>
  );
}

export function SafetyOverviewCards({ data }: SafetyOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <OverviewCard
        title="Total Safety Events"
        value={data.overview.totalEvents}
        icon={Shield}
        color="blue"
        subtext={`Last 30 days (${data.overview.trendDirection})`}
        trend={
          data.overview.trendDirection === "increasing"
            ? "up"
            : data.overview.trendDirection === "decreasing"
              ? "down"
              : "stable"
        }
      />
      <OverviewCard
        title="Critical Events"
        value={data.overview.criticalCount}
        icon={AlertTriangle}
        color={data.overview.criticalCount > 0 ? "red" : "green"}
        subtext="Require immediate attention"
      />
      <OverviewCard
        title="Unresolved Escalations"
        value={data.overview.unresolvedEscalations}
        icon={Zap}
        color={data.overview.unresolvedEscalations > 0 ? "amber" : "green"}
        subtext="Pending admin action"
      />
      <OverviewCard
        title="Compliance Coverage"
        value={data.statistics.regulatoryImpact.aiActEvents > 0 ? "100%" : "0%"}
        icon={CheckCircle}
        color="green"
        subtext="AI Act Article 14 compliance"
      />
    </div>
  );
}
