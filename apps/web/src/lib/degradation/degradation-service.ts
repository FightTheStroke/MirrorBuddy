/**
 * Degradation Service
 *
 * V1Plan FASE 2.0.6: Graceful degradation for enterprise reliability
 * - Monitors service health
 * - Automatically degrades features based on rules
 * - Recovers when services stabilize
 */

import { logger } from '@/lib/logger';
import {
  stopDegradationPolicy,
  recoverDegradationPolicy,
  isDegradationRecoveryPending,
  resetDegradationPolicy,
} from './degradation-policy';
import {
  DEFAULT_RULES,
  checkDegradationTrigger,
  checkRecoveryConditions,
  serviceAffectsFeature,
} from './degradation-rules';
import type { KnownFeatureFlag } from '../feature-flags/types';
import type {
  DegradationEvent,
  DegradationRule,
  DegradationState,
  FallbackBehavior,
  ServiceHealth,
} from './types';

// Service health tracking
const serviceHealth = new Map<string, ServiceHealth>();

// Degradation rules per feature
const degradationRules = new Map<KnownFeatureFlag, DegradationRule>();

// Current degradation state
const currentState: DegradationState = {
  level: 'none',
  activeRules: [],
  degradedFeatures: new Map(),
  since: new Date(),
};

// Event history for debugging
const eventHistory: DegradationEvent[] = [];
const MAX_EVENT_HISTORY = 100;

/**
 * Initialize degradation rules for known features
 */
export function initializeDegradationRules(): void {
  DEFAULT_RULES.forEach(registerRule);

  logger.info('Degradation rules initialized', {
    count: degradationRules.size,
  });
}

/**
 * Register a degradation rule for a feature
 */
export function registerRule(rule: DegradationRule): void {
  degradationRules.set(rule.featureId, rule);
}

/**
 * Record a health check for a service
 */
export function recordHealthCheck(serviceId: string, healthy: boolean, latencyMs: number): void {
  const existing = serviceHealth.get(serviceId);
  const now = new Date();

  const updated: ServiceHealth = {
    serviceId,
    healthy,
    latencyMs,
    errorRate: existing ? calculateErrorRate(existing.errorRate, healthy) : healthy ? 0 : 1,
    lastCheck: now,
    consecutiveFailures: healthy ? 0 : (existing?.consecutiveFailures ?? 0) + 1,
  };

  serviceHealth.set(serviceId, updated);
  evaluateDegradation(serviceId, updated);
}

/**
 * Manually degrade a feature
 */
export function degradeFeature(
  featureId: KnownFeatureFlag,
  behavior: FallbackBehavior,
  reason: string,
): void {
  const previousState = currentState.degradedFeatures.get(featureId);
  currentState.degradedFeatures.set(featureId, behavior);

  stopDegradationPolicy(featureId, behavior, reason);

  recordEvent({
    timestamp: new Date(),
    featureId,
    previousState: previousState ?? 'enabled',
    newState: behavior,
    reason,
  });

  updateDegradationLevel();

  logger.warn('Feature degraded', { featureId, behavior, reason });
}

/**
 * Recover a feature from degradation
 */
export function recoverFeature(
  featureId: KnownFeatureFlag,
  reason: string,
  explicit = true,
): Promise<void> {
  const previousState = currentState.degradedFeatures.get(featureId);
  if (!previousState) return Promise.resolve();
  return recoverDegradationPolicy(
    featureId,
    () => {
      currentState.degradedFeatures.delete(featureId);
      recordEvent({ timestamp: new Date(), featureId, previousState, newState: 'enabled', reason });
      updateDegradationLevel();
      logger.info('Feature recovered', { featureId, reason });
    },
    explicit,
  );
}

/**
 * Get current degradation state
 */
export function getDegradationState(): DegradationState {
  return { ...currentState };
}

/**
 * Get fallback behavior for a feature
 */
export function getFallbackBehavior(featureId: KnownFeatureFlag): FallbackBehavior | null {
  return currentState.degradedFeatures.get(featureId) ?? null;
}

/**
 * Check if system is in degraded state
 */
export function isSystemDegraded(): boolean {
  return currentState.level !== 'none';
}

/**
 * Get service health status
 */
export function getServiceHealth(serviceId: string): ServiceHealth | undefined {
  return serviceHealth.get(serviceId);
}

/**
 * Get all service health statuses
 */
export function getAllServiceHealth(): ServiceHealth[] {
  return Array.from(serviceHealth.values());
}

/**
 * Get recent degradation events
 */
export function getRecentEvents(limit = 20): DegradationEvent[] {
  return eventHistory.slice(-limit);
}

/**
 * Reset all state (for testing only)
 */
export function _resetState(): void {
  resetDegradationPolicy();
  serviceHealth.clear();
  currentState.level = 'none';
  currentState.activeRules = [];
  currentState.degradedFeatures.clear();
  currentState.since = new Date();
  eventHistory.length = 0;
}

// Internal: Evaluate if degradation is needed
function evaluateDegradation(serviceId: string, health: ServiceHealth): void {
  // Find rules that match this service
  for (const [featureId, rule] of degradationRules.entries()) {
    // Check if this service affects this feature
    if (!serviceAffectsFeature(serviceId, featureId)) continue;

    const shouldDegrade = checkDegradationTrigger(health, rule);
    const isDegraded = currentState.degradedFeatures.has(featureId);

    if (shouldDegrade && (!isDegraded || isDegradationRecoveryPending(featureId))) {
      degradeFeature(
        featureId,
        rule.fallbackBehavior,
        `Service ${serviceId} unhealthy: latency=${health.latencyMs}ms, ` +
          `errorRate=${(health.errorRate * 100).toFixed(1)}%, ` +
          `failures=${health.consecutiveFailures}`,
      );
    } else if (!shouldDegrade && isDegraded && checkRecoveryConditions(health, rule)) {
      void recoverFeature(featureId, `Service ${serviceId} recovered`, false);
    }
  }
}

// Calculate rolling error rate
function calculateErrorRate(previousRate: number, healthy: boolean): number {
  const alpha = 0.2; // Smoothing factor
  const newValue = healthy ? 0 : 1;
  return alpha * newValue + (1 - alpha) * previousRate;
}

// Update overall degradation level
function updateDegradationLevel(): void {
  const degradedCount = currentState.degradedFeatures.size;

  if (degradedCount === 0) {
    currentState.level = 'none';
  } else if (degradedCount <= 2) {
    currentState.level = 'partial';
  } else if (degradedCount <= 5) {
    currentState.level = 'severe';
  } else {
    currentState.level = 'critical';
  }

  currentState.since = new Date();
}

// Record event in history
function recordEvent(event: DegradationEvent): void {
  eventHistory.push(event);
  if (eventHistory.length > MAX_EVENT_HISTORY) {
    eventHistory.shift();
  }
}

// Auto-initialize on import
initializeDegradationRules();
