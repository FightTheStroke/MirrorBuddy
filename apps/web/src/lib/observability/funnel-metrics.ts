/**
 * Funnel Metrics for Trial and Invite System
 *
 * Tracks conversion funnels:
 * - Trial: start → engaged → limit_hit → beta_request
 * - Invite: request → approved → first_login → active
 *
 * Metrics are pushed to Grafana Cloud via prometheus-push-service.
 */

import { logger } from "@/lib/logger";

interface FunnelMetrics {
  trial: {
    started: number;
    engaged: number; // 1+ chats
    limitHit: number;
    betaRequested: number;
  };
  invite: {
    requested: number;
    approved: number;
    rejected: number;
    firstLogin: number;
    active: number; // logged in within 7 days
  };
  budget: {
    usedEur: number;
    limitEur: number;
    projectedMonthlyEur: number;
  };
  abuse: {
    flaggedSessions: number;
    blockedSessions: number;
    totalAbuseScore: number;
  };
}

// In-memory counters (reset on server restart)
// In production, these would be aggregated from DB
const counters: FunnelMetrics = {
  trial: {
    started: 0,
    engaged: 0,
    limitHit: 0,
    betaRequested: 0,
  },
  invite: {
    requested: 0,
    approved: 0,
    rejected: 0,
    firstLogin: 0,
    active: 0,
  },
  budget: {
    usedEur: 0,
    limitEur: 100,
    projectedMonthlyEur: 0,
  },
  abuse: {
    flaggedSessions: 0,
    blockedSessions: 0,
    totalAbuseScore: 0,
  },
};

// Increment functions for funnel tracking
export function incrementTrialStarted(): void {
  counters.trial.started++;
  logger.debug("Trial started", { total: counters.trial.started });
}

export function incrementTrialEngaged(): void {
  counters.trial.engaged++;
  logger.debug("Trial engaged", { total: counters.trial.engaged });
}

export function incrementTrialLimitHit(): void {
  counters.trial.limitHit++;
  logger.debug("Trial limit hit", { total: counters.trial.limitHit });
}

export function incrementBetaRequested(): void {
  counters.trial.betaRequested++;
  logger.debug("Beta requested", { total: counters.trial.betaRequested });
}

export function incrementInviteRequested(): void {
  counters.invite.requested++;
  logger.debug("Invite requested", { total: counters.invite.requested });
}

export function incrementInviteApproved(): void {
  counters.invite.approved++;
  logger.debug("Invite approved", { total: counters.invite.approved });
}

export function incrementInviteRejected(): void {
  counters.invite.rejected++;
  logger.debug("Invite rejected", { total: counters.invite.rejected });
}

export function incrementFirstLogin(): void {
  counters.invite.firstLogin++;
  logger.debug("First login", { total: counters.invite.firstLogin });
}

export function incrementActiveUser(): void {
  counters.invite.active++;
  logger.debug("Active user", { total: counters.invite.active });
}

export function updateBudget(usedEur: number, limitEur: number): void {
  counters.budget.usedEur = usedEur;
  counters.budget.limitEur = limitEur;

  // Project monthly usage based on current day of month
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  counters.budget.projectedMonthlyEur = (usedEur / dayOfMonth) * daysInMonth;

  logger.debug("Budget updated", {
    usedEur,
    limitEur,
    projectedMonthlyEur: counters.budget.projectedMonthlyEur,
  });
}

export function incrementAbuseFlagged(): void {
  counters.abuse.flaggedSessions++;
  logger.debug("Abuse flagged", { total: counters.abuse.flaggedSessions });
}

export function incrementAbuseBlocked(): void {
  counters.abuse.blockedSessions++;
  logger.debug("Abuse blocked", { total: counters.abuse.blockedSessions });
}

export function addAbuseScore(score: number): void {
  counters.abuse.totalAbuseScore += score;
  logger.debug("Abuse score added", { total: counters.abuse.totalAbuseScore });
}

// Get current metrics for push service
export function getFunnelMetrics(): FunnelMetrics {
  return { ...counters };
}

// Reset counters (for testing)
export function resetFunnelMetrics(): void {
  counters.trial = { started: 0, engaged: 0, limitHit: 0, betaRequested: 0 };
  counters.invite = {
    requested: 0,
    approved: 0,
    rejected: 0,
    firstLogin: 0,
    active: 0,
  };
  counters.budget = { usedEur: 0, limitEur: 100, projectedMonthlyEur: 0 };
  counters.abuse = {
    flaggedSessions: 0,
    blockedSessions: 0,
    totalAbuseScore: 0,
  };
}

// Calculate conversion rates
export function getConversionRates(): {
  trialToEngaged: number;
  engagedToLimit: number;
  limitToRequest: number;
  requestToApproved: number;
  approvedToLogin: number;
  loginToActive: number;
} {
  const { trial, invite } = counters;

  return {
    trialToEngaged: trial.started > 0 ? trial.engaged / trial.started : 0,
    engagedToLimit: trial.engaged > 0 ? trial.limitHit / trial.engaged : 0,
    limitToRequest:
      trial.limitHit > 0 ? trial.betaRequested / trial.limitHit : 0,
    requestToApproved:
      invite.requested > 0 ? invite.approved / invite.requested : 0,
    approvedToLogin:
      invite.approved > 0 ? invite.firstLogin / invite.approved : 0,
    loginToActive:
      invite.firstLogin > 0 ? invite.active / invite.firstLogin : 0,
  };
}

export type { FunnelMetrics };
