import type { KnownFeatureFlag } from '../feature-flags/types';
import type { DegradationRule, ServiceHealth } from './types';

const DEFAULT_THRESHOLDS = {
  maxLatencyMs: 5000,
  maxErrorRate: 0.1,
  maxConsecutiveFailures: 3,
  minSuccessRate: 0.95,
  minSuccessfulChecks: 5,
};

export const DEFAULT_RULES: DegradationRule[] = [
  {
    featureId: 'voice_realtime',
    triggerConditions: { maxLatencyMs: 3000, maxErrorRate: 0.05, maxConsecutiveFailures: 2 },
    fallbackBehavior: 'disable',
    recoveryConditions: { minSuccessRate: 0.98, minSuccessfulChecks: 10 },
  },
  {
    featureId: 'rag_enabled',
    triggerConditions: { maxLatencyMs: 2000, maxErrorRate: 0.1 },
    fallbackBehavior: 'cache',
    recoveryConditions: { minSuccessRate: 0.95, minSuccessfulChecks: 5 },
  },
  {
    featureId: 'pdf_export',
    triggerConditions: { maxLatencyMs: 10000, maxErrorRate: 0.15 },
    fallbackBehavior: 'simplified',
    recoveryConditions: { minSuccessRate: 0.9, minSuccessfulChecks: 3 },
  },
];

export function checkDegradationTrigger(health: ServiceHealth, rule: DegradationRule): boolean {
  const t = { ...DEFAULT_THRESHOLDS, ...rule.triggerConditions };
  return !!(
    (t.maxLatencyMs && health.latencyMs > t.maxLatencyMs) ||
    (t.maxErrorRate && health.errorRate > t.maxErrorRate) ||
    (t.maxConsecutiveFailures && health.consecutiveFailures >= t.maxConsecutiveFailures)
  );
}

export function checkRecoveryConditions(health: ServiceHealth, rule: DegradationRule): boolean {
  const r = { ...DEFAULT_THRESHOLDS, ...rule.recoveryConditions };
  return 1 - health.errorRate >= (r.minSuccessRate ?? 0.95);
}

export function serviceAffectsFeature(serviceId: string, featureId: KnownFeatureFlag): boolean {
  const mapping: Record<string, KnownFeatureFlag[]> = {
    'azure-openai': ['voice_realtime', 'rag_enabled', 'quiz', 'mindmap', 'flashcards'],
    'azure-realtime': ['voice_realtime'],
    postgresql: ['rag_enabled', 'flashcards', 'gamification', 'parent_dashboard'],
    'pdf-renderer': ['pdf_export'],
  };
  return mapping[serviceId]?.includes(featureId) ?? false;
}
