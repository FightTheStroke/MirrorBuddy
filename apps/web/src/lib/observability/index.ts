/**
 * Observability Module
 *
 * Exports metrics store, push service, limit modules, and threshold logic
 * for use across the application.
 */

export { metricsStore } from "./metrics-store";
export { prometheusPushService } from "./prometheus-push-service";
export { setSentryTierContext } from "./sentry-tier-context";

// Threshold logic (F-07, F-25)
export {
  calculateStatus,
  shouldTriggerProactiveAlert,
  getAlertMessage,
  shouldSendAlert,
  annotateMetric,
  THRESHOLDS,
  type AlertStatus,
  type MetricWithStatus,
} from "./threshold-logic";

// Service limits (F-18: every limit monitored)
export {
  getVercelLimits,
  clearVercelLimitsCache,
  type VercelLimits,
} from "./vercel-limits";
export {
  getSupabaseLimits,
  isResourceStressed,
  getStressReport,
  type SupabaseLimits,
  type ResourceMetric,
} from "./supabase-limits";
// Additional service limits - exports available when modules are implemented:
// export { getResendLimits, ... } from './resend-limits';
// export { getAzureOpenAILimits, ... } from './azure-openai-limits';
// export { getRedisLimits, ... } from './redis-limits';

export type {
  LatencyDataPoint,
  ErrorDataPoint,
  RouteMetrics,
  MetricsSummary,
} from "./metrics-store";
