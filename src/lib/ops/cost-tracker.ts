/**
 * Cost Tracker Service
 *
 * Aggregates cost data across all providers:
 * - Azure OpenAI: variable, from real token data in SessionMetrics
 * - Vercel, Supabase, Sentry: fixed monthly budgets via env vars
 *
 * Plan 105 - W5-Alerting [T5-04]
 */

import { getCostStats } from "@/lib/metrics/cost-tracking-service";
import { getAllExternalServiceUsage } from "@/lib/metrics/external-service-metrics";
import type { ExternalServiceUsage } from "@/lib/metrics/external-service-metrics";

export interface ServiceCostSummary {
  service: string;
  estimatedMonthlyCost: number;
  currentSpend: number;
  budgetLimit: number;
  budgetUsagePercent: number;
  status: "ok" | "warning" | "exceeded";
  details: Record<string, number>;
}

export interface CostAlert {
  service: string;
  message: string;
  severity: "warning" | "critical";
}

export interface CostDashboardData {
  services: ServiceCostSummary[];
  totalMonthly: number;
  totalBudget: number;
  alerts: CostAlert[];
  quotas: ExternalServiceUsage[];
  timestamp: string;
}

/** Fixed monthly budgets (EUR) from env vars with sensible defaults */
const BUDGETS = {
  vercel: parseFloat(process.env.BUDGET_VERCEL_EUR || "20"),
  supabase: parseFloat(process.env.BUDGET_SUPABASE_EUR || "25"),
  sentry: parseFloat(process.env.BUDGET_SENTRY_EUR || "26"),
  total: parseFloat(process.env.BUDGET_TOTAL_EUR || "150"),
};

const WARN_THRESHOLD = 0.8;
const CRITICAL_THRESHOLD = 0.95;

/** In-memory cache (60s TTL) */
let cached: CostDashboardData | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

/**
 * Get aggregated cost dashboard data (cached 60s)
 */
export async function getCostDashboardData(): Promise<CostDashboardData> {
  const now = Date.now();
  if (cached && now - cacheTime < CACHE_TTL) {
    return cached;
  }

  const [azureCosts, quotas] = await Promise.all([
    getAzureOpenAICosts(),
    getAllExternalServiceUsage(),
  ]);

  const services: ServiceCostSummary[] = [
    azureCosts,
    createFixedService("Vercel", BUDGETS.vercel),
    createFixedService("Supabase", BUDGETS.supabase),
    createFixedService("Sentry", BUDGETS.sentry),
  ];

  const totalMonthly = services.reduce(
    (sum, s) => sum + s.estimatedMonthlyCost,
    0,
  );

  const alerts: CostAlert[] = [];
  for (const svc of services) {
    if (svc.status === "exceeded") {
      alerts.push({
        service: svc.service,
        message: `${svc.service} has exceeded budget (${svc.budgetUsagePercent.toFixed(0)}%)`,
        severity: "critical",
      });
    } else if (svc.status === "warning") {
      alerts.push({
        service: svc.service,
        message: `${svc.service} approaching budget limit (${svc.budgetUsagePercent.toFixed(0)}%)`,
        severity: "warning",
      });
    }
  }

  // Add quota alerts from external services
  for (const q of quotas) {
    if (q.status === "critical" || q.status === "exceeded") {
      alerts.push({
        service: q.service,
        message: `${q.metric}: ${q.usagePercent.toFixed(1)}% of quota used`,
        severity: "critical",
      });
    }
  }

  const data: CostDashboardData = {
    services,
    totalMonthly: round(totalMonthly),
    totalBudget: BUDGETS.total,
    alerts,
    quotas,
    timestamp: new Date().toISOString(),
  };

  cached = data;
  cacheTime = now;
  return data;
}

/**
 * Azure OpenAI: extrapolate monthly cost from current month data
 */
async function getAzureOpenAICosts(): Promise<ServiceCostSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const dayOfMonth = now.getDate();

  const stats = await getCostStats(monthStart, now);

  const dailyAvg = dayOfMonth > 0 ? stats.totalCost / dayOfMonth : 0;
  const estimatedMonthly = dailyAvg * daysInMonth;
  const budgetLimit =
    BUDGETS.total - BUDGETS.vercel - BUDGETS.supabase - BUDGETS.sentry;
  const usagePercent =
    budgetLimit > 0 ? (estimatedMonthly / budgetLimit) * 100 : 0;

  return {
    service: "Azure OpenAI",
    estimatedMonthlyCost: round(estimatedMonthly),
    currentSpend: round(stats.totalCost),
    budgetLimit: round(budgetLimit),
    budgetUsagePercent: round(usagePercent),
    status: getStatus(usagePercent / 100),
    details: {
      sessionsThisMonth: stats.sessionCount,
      avgCostPerSession: stats.avgCostPerSession,
      dailyAverage: round(dailyAvg),
    },
  };
}

/** Create summary for fixed-cost services */
function createFixedService(
  service: string,
  monthlyBudget: number,
): ServiceCostSummary {
  return {
    service,
    estimatedMonthlyCost: monthlyBudget,
    currentSpend: monthlyBudget,
    budgetLimit: monthlyBudget,
    budgetUsagePercent: 100,
    status: "ok",
    details: { fixedMonthly: monthlyBudget },
  };
}

function getStatus(ratio: number): "ok" | "warning" | "exceeded" {
  if (ratio >= CRITICAL_THRESHOLD) return "exceeded";
  if (ratio >= WARN_THRESHOLD) return "warning";
  return "ok";
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
