/**
 * Alerting System Types
 *
 * V1Plan FASE 2.0.7: Go/No-Go alerting for SLO monitoring
 */

export type AlertSeverity = "info" | "warning" | "error" | "critical";

export type AlertStatus = "active" | "acknowledged" | "resolved";

export type GoNoGoDecision = "go" | "nogo" | "degraded";

export interface SLODefinition {
  id: string;
  name: string;
  description: string;
  target: number; // 0-100 percentage
  errorBudget: number; // Remaining error budget in percentage
  window: "hourly" | "daily" | "weekly" | "monthly";
  metric: string;
  threshold: {
    warning: number;
    critical: number;
  };
}

export interface SLOStatus {
  sloId: string;
  currentValue: number;
  target: number;
  errorBudgetRemaining: number;
  status: "healthy" | "warning" | "breached";
  trend: "improving" | "stable" | "degrading";
  lastUpdated: Date;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  sloId?: string;
  featureId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface GoNoGoCheck {
  checkId: string;
  name: string;
  required: boolean;
  status: "pass" | "fail" | "skip";
  message?: string;
  checkedAt: Date;
}

export interface GoNoGoResult {
  decision: GoNoGoDecision;
  checks: GoNoGoCheck[];
  passedCount: number;
  failedCount: number;
  requiredFailures: number;
  timestamp: Date;
  overrideReason?: string;
  overrideBy?: string;
}

export interface AlertingConfig {
  webhookUrl?: string;
  emailRecipients?: string[];
  slackChannel?: string;
  pagerDutyKey?: string;
  enabled: boolean;
}
