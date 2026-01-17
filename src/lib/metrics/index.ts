/**
 * Metrics Module
 *
 * Session behavioral metrics for V1Plan observability.
 * Cost tracking based on REAL API data (not estimates).
 */

// Session lifecycle and tracking
export {
  startSession,
  recordTurn,
  recordVoiceUsage,
  recordRefusal,
  recordIncident,
  recordJailbreakAttempt,
  endSession,
  getSessionState,
  cleanupAbandonedSessions,
} from "./session-metrics-service";

export type {
  SessionOutcome,
  IncidentSeverity,
} from "./session-metrics-service";

// Cost tracking and budget enforcement
export {
  calculateCost,
  checkSessionCost,
  getUserDailyCost,
  checkUserDailyBudget,
  getCostStats,
  detectCostSpike,
  getCostMetricsSummary,
  THRESHOLDS,
  PRICING,
} from "./cost-tracking-service";

export type {
  CostBreakdown,
  UsageData,
  CostStatus,
} from "./cost-tracking-service";

// External service usage and quota tracking
export {
  recordExternalApiCall,
  getAzureOpenAIUsage,
  getGoogleDriveUsage,
  getBraveSearchUsage,
  getAllExternalServiceUsage,
  getServiceAlerts,
  generateExternalServiceMetrics,
  EXTERNAL_SERVICE_QUOTAS,
} from "./external-service-metrics";

export type { ExternalServiceUsage } from "./external-service-metrics";
