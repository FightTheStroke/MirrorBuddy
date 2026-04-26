import type { SubscriptionStatus } from "@prisma/client";

/**
 * Tier subscription feature flags and configuration
 */
export interface TierFeatures {
  chat: boolean;
  voice: boolean;
  flashcards: boolean;
  quizzes: boolean;
  mindMaps: boolean;
  tools: string[];
  maestriLimit: number;
  coachesAvailable: string[];
  buddiesAvailable: string[];
  parentDashboard?: boolean;
  prioritySupport?: boolean;
  advancedAnalytics?: boolean;
  unlimitedStorage?: boolean;
  [key: string]: unknown;
}

/**
 * Feature types for per-feature model selection (ADR 0073)
 */
export type FeatureType =
  | "chat"
  | "realtime"
  | "pdf"
  | "mindmap"
  | "quiz"
  | "flashcards"
  | "summary"
  | "formula"
  | "chart"
  | "homework"
  | "webcam"
  | "demo";

/**
 * Per-feature AI configuration (ADR 0073)
 * Allows full control over model, temperature, and maxTokens per feature
 */
export interface FeatureAIConfig {
  /** AI model to use for this feature */
  model: string;
  /** Temperature for AI responses (0-2, default varies by feature) */
  temperature: number;
  /** Maximum tokens for AI responses */
  maxTokens: number;
}

/**
 * Default AI configurations per feature type
 * Used when tier doesn't specify custom values
 */
export const DEFAULT_FEATURE_CONFIGS: Record<
  FeatureType,
  Omit<FeatureAIConfig, "model">
> = {
  chat: { temperature: 0.7, maxTokens: 2000 },
  realtime: { temperature: 0.7, maxTokens: 4096 },
  pdf: { temperature: 0.5, maxTokens: 4000 },
  mindmap: { temperature: 0.7, maxTokens: 1500 },
  quiz: { temperature: 0.7, maxTokens: 2000 },
  flashcards: { temperature: 0.6, maxTokens: 2000 },
  summary: { temperature: 0.5, maxTokens: 2000 },
  formula: { temperature: 0.3, maxTokens: 1500 },
  chart: { temperature: 0.5, maxTokens: 1500 },
  homework: { temperature: 0.6, maxTokens: 3000 },
  webcam: { temperature: 0.5, maxTokens: 2000 },
  demo: { temperature: 0.8, maxTokens: 4000 },
};

/**
 * Feature config overrides stored in tier (JSON field)
 * Allows admin to customize temperature/maxTokens per feature per tier
 */
export type TierFeatureConfigs = Partial<
  Record<FeatureType, Partial<FeatureAIConfig>>
>;

/**
 * Tier definition - subscription tier configuration
 */
export interface TierDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  chatLimitDaily: number;
  voiceMinutesDaily: number;
  toolsLimitDaily: number;
  docsLimitTotal: number;

  // Video vision limits (ADR 0122)
  videoVisionSecondsPerSession: number;
  videoVisionMinutesMonthly: number;

  // Per-feature model selection (ADR 0073)
  chatModel: string;
  realtimeModel: string;
  pdfModel: string;
  mindmapModel: string;
  quizModel: string;
  flashcardsModel: string;
  summaryModel: string;
  formulaModel: string;
  chartModel: string;
  homeworkModel: string;
  webcamModel: string;
  demoModel: string;

  // Per-feature AI config overrides (ADR 0073)
  // JSON field for temperature/maxTokens customization per feature
  featureConfigs: TierFeatureConfigs | null;

  features: TierFeatures;
  availableMaestri: string[];
  availableCoaches: string[];
  availableBuddies: string[];
  availableTools: string[];
  stripePriceId: string | null;
  monthlyPriceEur: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Model catalog entry with metadata
 */
export interface ModelCatalogEntry {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  deploymentName: string;
  category: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  maxTokens: number;
  contextWindow: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsJson: boolean;
  qualityScore: number;
  speedScore: number;
  educationScore: number;
  recommendedFor: string[];
  notRecommendedFor: string[];
  notes: string | null;
  isActive: boolean;
}

/**
 * User subscription with limit and feature overrides
 */
export interface UserSubscription {
  id: string;
  userId: string;
  tierId: string;
  tier?: TierDefinition;
  overrideLimits: Record<string, number> | null;
  overrideFeatures: Partial<TierFeatures> | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User-level feature AI config override (ADR 0073)
 * Admin can customize model/temperature/maxTokens per feature per user
 */
export interface UserFeatureConfig {
  id: string;
  userId: string;
  feature: FeatureType;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  isEnabled: boolean | null;
  setBy: string;
  reason: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating/updating user feature config
 */
export interface UserFeatureConfigInput {
  feature: FeatureType;
  model?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  isEnabled?: boolean | null;
  reason?: string | null;
  expiresAt?: Date | null;
}

/**
 * Tier audit action types
 */
export type TierAuditAction =
  | "TIER_CREATE"
  | "TIER_UPDATE"
  | "TIER_DELETE"
  | "SUBSCRIPTION_CREATE"
  | "SUBSCRIPTION_UPDATE"
  | "SUBSCRIPTION_DELETE"
  | "TIER_CHANGE"
  | "USER_STATUS_CHANGE"
  | "USER_FEATURE_CONFIG_SET"
  | "USER_FEATURE_CONFIG_DELETE"
  | "USER_STATUS_CHANGE";

/**
 * Tier audit log entry
 */
export interface TierAuditLog {
  id: string;
  tierId: string | null;
  userId: string | null;
  adminId: string;
  action: TierAuditAction;
  changes: Record<string, unknown>;
  notes: string | null;
  createdAt: Date;
}

/**
 * Tier configuration snapshot for version control (ADR 0073)
 * Enables backup, rollback, A/B testing, and configuration history
 */
export interface TierConfigSnapshot {
  id: string;
  tierId: string;
  version: number;
  name: string;
  description: string | null;
  configSnapshot: TierDefinition;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  isBaseline: boolean;
}

/**
 * Effective subscription limits (after applying overrides)
 */
export interface EffectiveSubscriptionLimits {
  chatLimitDaily: number;
  voiceMinutesDaily: number;
  toolsLimitDaily: number;
  docsLimitTotal: number;
  videoVisionSecondsPerSession: number;
  videoVisionMinutesMonthly: number;
  chatModel: string;
  realtimeModel: string;
}

/**
 * Subscription status values
 */
export type SubscriptionStatusType =
  | "ACTIVE"
  | "TRIAL"
  | "EXPIRED"
  | "CANCELLED"
  | "PAUSED";

/**
 * Tier codes (constants)
 */
export enum TierCode {
  TRIAL = "trial",
  BASE = "base",
  PRO = "pro",
}

/**
 * Get display name for subscription status
 */
export function getSubscriptionStatusDisplay(
  status: SubscriptionStatus,
): string {
  const statusMap: Record<SubscriptionStatus, string> = {
    ACTIVE: "Activo",
    TRIAL: "Prueba",
    EXPIRED: "Expirado",
    CANCELLED: "Cancelado",
    PAUSED: "Pausado",
  };
  return statusMap[status] || status;
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIAL";
}

/**
 * Check if subscription is expired
 */
export function isSubscriptionExpired(subscription: UserSubscription): boolean {
  if (!subscription.expiresAt) return false;
  return (
    new Date() > subscription.expiresAt && subscription.status === "ACTIVE"
  );
}

/**
 * Tier limits for user consumption tracking
 */
export interface TierLimits {
  dailyMessages: number;
  dailyVoiceMinutes: number;
  dailyTools: number;
  maxDocuments: number;
  maxMaestri: number;
  monthlyAiCalls?: number;
  videoVisionSecondsPerSession: number;
  videoVisionMinutesMonthly: number;
}
