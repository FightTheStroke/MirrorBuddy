/**
 * AI/Email Monitoring Types
 * Types for Azure OpenAI, Sentry, and Resend metrics
 */

export type ServiceStatus = "healthy" | "degraded" | "down";

export interface AzureOpenAIMetrics {
  status: ServiceStatus;
  tokensUsed: number;
  tokensLimit: number;
  requestsPerMinute: number;
  rpmLimit: number;
  estimatedCostUsd: number;
  model: string;
}

export interface SentryMetrics {
  status: ServiceStatus;
  unresolvedIssues: number;
  eventsToday: number;
  eventsLimit: number;
}

export interface ResendMetrics {
  status: ServiceStatus;
  emailsSentToday: number;
  emailsLimit: number;
  bounceRate: number;
  lastSentAt: string | null;
}

export interface AIEmailMetrics {
  azureOpenAI: AzureOpenAIMetrics | null;
  sentry: SentryMetrics | null;
  resend: ResendMetrics | null;
}
