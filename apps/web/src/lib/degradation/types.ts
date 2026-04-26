/**
 * Degradation Service Types
 *
 * V1Plan FASE 2.0.6: Graceful degradation for enterprise reliability
 */

import type { KnownFeatureFlag } from "../feature-flags/types";

export type DegradationLevel = "none" | "partial" | "severe" | "critical";

export type FallbackBehavior = "disable" | "cache" | "static" | "simplified";

export interface ServiceHealth {
  serviceId: string;
  healthy: boolean;
  latencyMs: number;
  errorRate: number;
  lastCheck: Date;
  consecutiveFailures: number;
}

export interface DegradationRule {
  featureId: KnownFeatureFlag;
  triggerConditions: {
    maxLatencyMs?: number;
    maxErrorRate?: number;
    maxConsecutiveFailures?: number;
  };
  fallbackBehavior: FallbackBehavior;
  fallbackValue?: unknown;
  recoveryConditions: {
    minSuccessRate?: number;
    minSuccessfulChecks?: number;
  };
}

export interface DegradationState {
  level: DegradationLevel;
  activeRules: string[];
  degradedFeatures: Map<KnownFeatureFlag, FallbackBehavior>;
  since: Date;
}

export interface DegradationEvent {
  timestamp: Date;
  featureId: KnownFeatureFlag;
  previousState: FallbackBehavior | "enabled";
  newState: FallbackBehavior | "enabled";
  reason: string;
  metrics?: {
    latencyMs?: number;
    errorRate?: number;
    consecutiveFailures?: number;
  };
}
