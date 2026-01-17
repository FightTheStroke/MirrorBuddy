/**
 * Feature Flags Type Definitions
 *
 * V1Plan FASE 2.0.6: Feature flags for controlled rollout and kill-switch
 */

export type FeatureFlagStatus = "enabled" | "disabled" | "degraded";

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  status: FeatureFlagStatus;
  enabledPercentage: number; // 0-100 for gradual rollout
  killSwitch: boolean; // true = force disabled regardless of status
  metadata?: Record<string, unknown>;
  updatedAt: Date;
  updatedBy?: string;
}

// Known feature flags for type safety
export type KnownFeatureFlag =
  | "voice_realtime" // Real-time voice API
  | "rag_enabled" // RAG retrieval
  | "flashcards" // FSRS flashcards
  | "mindmap" // Mind map generation
  | "quiz" // Quiz generation
  | "pomodoro" // Pomodoro timer
  | "gamification" // XP and achievements
  | "parent_dashboard" // Parent/professor portal
  | "pdf_export" // PDF generation
  | "ambient_audio"; // Background audio

export interface FeatureFlagUpdate {
  status?: FeatureFlagStatus;
  enabledPercentage?: number;
  killSwitch?: boolean;
  metadata?: Record<string, unknown>;
  updatedBy?: string;
}

export interface FeatureFlagCheckResult {
  enabled: boolean;
  reason:
    | "enabled"
    | "disabled"
    | "kill_switch"
    | "percentage_rollout"
    | "degraded";
  flag: FeatureFlag;
}

// Degradation config for graceful fallbacks
export interface DegradationConfig {
  featureId: KnownFeatureFlag;
  fallbackBehavior: "disable" | "cache" | "static" | "simplified";
  fallbackValue?: unknown;
  healthCheckEndpoint?: string;
  recoveryTimeMs?: number;
}
