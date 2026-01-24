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
  chatModel: string;
  realtimeModel: string;
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
 * Tier audit log entry
 */
export interface TierAuditLog {
  id: string;
  tierId: string | null;
  userId: string | null;
  adminId: string;
  action: string;
  changes: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Effective subscription limits (after applying overrides)
 */
export interface EffectiveSubscriptionLimits {
  chatLimitDaily: number;
  voiceMinutesDaily: number;
  toolsLimitDaily: number;
  docsLimitTotal: number;
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
