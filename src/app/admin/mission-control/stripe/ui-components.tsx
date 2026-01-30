/**
 * Stripe Admin UI Components
 *
 * Basic UI components: MetricCard, StatusBadge, RevenueMetrics.
 */

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/admin/stripe-admin-service";
import { CreditCard, TrendingUp, Users, Euro } from "lucide-react";

/**
 * Metric card component
 */
export function MetricCard({
  title,
  value,
  icon,
  bgColor,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {value}
            </p>
          </div>
          <div className={`${bgColor} p-3 rounded-lg`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Status badge component
 */
export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { bg: string; text: string; label: string }> =
    {
      active: {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        text: "text-emerald-700 dark:text-emerald-400",
        label: "Active",
      },
      canceled: {
        bg: "bg-red-100 dark:bg-red-900/30",
        text: "text-red-700 dark:text-red-400",
        label: "Canceled",
      },
      past_due: {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        text: "text-amber-700 dark:text-amber-400",
        label: "Past Due",
      },
      trialing: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-700 dark:text-blue-400",
        label: "Trial",
      },
      incomplete: {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-400",
        label: "Incomplete",
      },
      inactive: {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-400",
        label: "Inactive",
      },
    };

  const variant = variants[status] || variants.inactive;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variant.bg} ${variant.text}`}
    >
      {variant.label}
    </span>
  );
}

/**
 * Revenue metrics grid component
 */
export function RevenueMetrics({
  mrr,
  arr,
  activeSubscriptions,
  totalRevenue,
  currency,
}: {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  totalRevenue: number;
  currency: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="MRR"
        value={formatCurrency(mrr, currency)}
        icon={<TrendingUp className="h-5 w-5 text-white" />}
        bgColor="bg-emerald-500"
      />
      <MetricCard
        title="ARR"
        value={formatCurrency(arr, currency)}
        icon={<Euro className="h-5 w-5 text-white" />}
        bgColor="bg-blue-500"
      />
      <MetricCard
        title="Active Subscriptions"
        value={String(activeSubscriptions)}
        icon={<Users className="h-5 w-5 text-white" />}
        bgColor="bg-indigo-500"
      />
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(totalRevenue, currency)}
        icon={<CreditCard className="h-5 w-5 text-white" />}
        bgColor="bg-purple-500"
      />
    </div>
  );
}
