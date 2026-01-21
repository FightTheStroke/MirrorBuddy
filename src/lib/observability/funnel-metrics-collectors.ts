/**
 * Funnel Metrics Collectors
 * Collects trial/invite funnel, budget, abuse, and conversion metrics.
 */

import { getFunnelMetrics, getConversionRates } from "./funnel-metrics";

export interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
  timestamp: number;
}

/**
 * Collect trial and invite funnel metrics
 */
export function collectFunnelMetrics(
  instanceLabels: Record<string, string>,
  timestamp: number,
): MetricSample[] {
  const funnel = getFunnelMetrics();

  return [
    // Trial funnel
    {
      name: "trial_started_total",
      labels: instanceLabels,
      value: funnel.trial.started,
      timestamp,
    },
    {
      name: "trial_engaged_total",
      labels: instanceLabels,
      value: funnel.trial.engaged,
      timestamp,
    },
    {
      name: "trial_limit_hit_total",
      labels: instanceLabels,
      value: funnel.trial.limitHit,
      timestamp,
    },
    {
      name: "trial_beta_requested_total",
      labels: instanceLabels,
      value: funnel.trial.betaRequested,
      timestamp,
    },
    // Invite funnel
    {
      name: "invite_requested_total",
      labels: instanceLabels,
      value: funnel.invite.requested,
      timestamp,
    },
    {
      name: "invite_approved_total",
      labels: instanceLabels,
      value: funnel.invite.approved,
      timestamp,
    },
    {
      name: "invite_rejected_total",
      labels: instanceLabels,
      value: funnel.invite.rejected,
      timestamp,
    },
    {
      name: "invite_first_login_total",
      labels: instanceLabels,
      value: funnel.invite.firstLogin,
      timestamp,
    },
    {
      name: "invite_active_total",
      labels: instanceLabels,
      value: funnel.invite.active,
      timestamp,
    },
  ];
}

/**
 * Collect budget metrics
 */
export function collectBudgetMetrics(
  instanceLabels: Record<string, string>,
  timestamp: number,
): MetricSample[] {
  const funnel = getFunnelMetrics();

  return [
    {
      name: "budget_used_eur",
      labels: instanceLabels,
      value: funnel.budget.usedEur,
      timestamp,
    },
    {
      name: "budget_limit_eur",
      labels: instanceLabels,
      value: funnel.budget.limitEur,
      timestamp,
    },
    {
      name: "budget_projected_monthly_eur",
      labels: instanceLabels,
      value: funnel.budget.projectedMonthlyEur,
      timestamp,
    },
    {
      name: "budget_usage_percent",
      labels: instanceLabels,
      value:
        funnel.budget.limitEur > 0
          ? (funnel.budget.usedEur / funnel.budget.limitEur) * 100
          : 0,
      timestamp,
    },
  ];
}

/**
 * Collect abuse metrics
 */
export function collectAbuseMetrics(
  instanceLabels: Record<string, string>,
  timestamp: number,
): MetricSample[] {
  const funnel = getFunnelMetrics();

  return [
    {
      name: "abuse_flagged_total",
      labels: instanceLabels,
      value: funnel.abuse.flaggedSessions,
      timestamp,
    },
    {
      name: "abuse_blocked_total",
      labels: instanceLabels,
      value: funnel.abuse.blockedSessions,
      timestamp,
    },
    {
      name: "abuse_score_total",
      labels: instanceLabels,
      value: funnel.abuse.totalAbuseScore,
      timestamp,
    },
  ];
}

/**
 * Collect conversion rate metrics
 */
export function collectConversionMetrics(
  instanceLabels: Record<string, string>,
  timestamp: number,
): MetricSample[] {
  const rates = getConversionRates();

  return [
    {
      name: "conversion_trial_to_engaged",
      labels: instanceLabels,
      value: rates.trialToEngaged,
      timestamp,
    },
    {
      name: "conversion_engaged_to_limit",
      labels: instanceLabels,
      value: rates.engagedToLimit,
      timestamp,
    },
    {
      name: "conversion_limit_to_request",
      labels: instanceLabels,
      value: rates.limitToRequest,
      timestamp,
    },
    {
      name: "conversion_request_to_approved",
      labels: instanceLabels,
      value: rates.requestToApproved,
      timestamp,
    },
    {
      name: "conversion_approved_to_login",
      labels: instanceLabels,
      value: rates.approvedToLogin,
      timestamp,
    },
    {
      name: "conversion_login_to_active",
      labels: instanceLabels,
      value: rates.loginToActive,
      timestamp,
    },
  ];
}
