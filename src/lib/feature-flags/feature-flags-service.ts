/**
 * Feature Flags Service
 *
 * V1Plan FASE 2.0.6: Centralized feature flag management
 * - In-memory cache with Prisma persistence
 * - Kill-switch support for emergency disabling
 * - Percentage-based rollout
 * - Graceful degradation hooks
 */

import { logger } from "@/lib/logger";
import type {
  FeatureFlag,
  FeatureFlagCheckResult,
  FeatureFlagStatus,
  FeatureFlagUpdate,
  KnownFeatureFlag,
} from "./types";

// Default feature flags configuration
const DEFAULT_FLAGS: Record<
  KnownFeatureFlag,
  Omit<FeatureFlag, "id" | "updatedAt">
> = {
  voice_realtime: {
    name: "Real-time Voice",
    description: "WebSocket-based real-time voice conversations",
    status: "enabled",
    enabledPercentage: 100,
    killSwitch: false,
  },
  rag_enabled: {
    name: "RAG Retrieval",
    description: "Semantic search for conversation context",
    status: "enabled",
    enabledPercentage: 100,
    killSwitch: false,
  },
  flashcards: {
    name: "FSRS Flashcards",
    description: "Spaced repetition flashcard system",
    status: "enabled",
    enabledPercentage: 100,
    killSwitch: false,
  },
  mindmap: {
    name: "Mind Maps",
    description: "Interactive mind map generation",
    status: "enabled",
    enabledPercentage: 100,
    killSwitch: false,
  },
  quiz: {
    name: "Quiz Generation",
    description: "AI-generated quizzes from content",
    status: "enabled",
    enabledPercentage: 100,
    killSwitch: false,
  },
  pomodoro: {
    name: "Pomodoro Timer",
    description: "Focus timer with breaks",
    status: "enabled",
    enabledPercentage: 100,
    killSwitch: false,
  },
  gamification: {
    name: "Gamification",
    description: "XP, levels, and achievements",
    status: "enabled",
    enabledPercentage: 100,
    killSwitch: false,
  },
  parent_dashboard: {
    name: "Parent Dashboard",
    description: "Parent/professor monitoring portal",
    status: "enabled",
    enabledPercentage: 100,
    killSwitch: false,
  },
  pdf_export: {
    name: "PDF Export",
    description: "Accessible PDF generation",
    status: "enabled",
    enabledPercentage: 100,
    killSwitch: false,
  },
  ambient_audio: {
    name: "Ambient Audio",
    description: "Background study sounds",
    status: "enabled",
    enabledPercentage: 100,
    killSwitch: false,
  },
};

// In-memory cache (initialized from defaults)
const flagCache = new Map<string, FeatureFlag>();

// Global kill-switch (disables ALL features)
let globalKillSwitch = false;

/**
 * Initialize flags from defaults (call on startup)
 */
export function initializeFlags(): void {
  const now = new Date();

  for (const [id, config] of Object.entries(DEFAULT_FLAGS)) {
    flagCache.set(id, {
      id,
      ...config,
      updatedAt: now,
    });
  }

  logger.info("Feature flags initialized", { count: flagCache.size });
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  featureId: KnownFeatureFlag,
  userId?: string,
): FeatureFlagCheckResult {
  const flag = flagCache.get(featureId);

  if (!flag) {
    logger.warn("Unknown feature flag checked", { featureId });
    return {
      enabled: false,
      reason: "disabled",
      flag: {
        id: featureId,
        name: featureId,
        description: "Unknown feature",
        status: "disabled",
        enabledPercentage: 0,
        killSwitch: false,
        updatedAt: new Date(),
      },
    };
  }

  // Global kill-switch takes priority
  if (globalKillSwitch) {
    return { enabled: false, reason: "kill_switch", flag };
  }

  // Per-feature kill-switch
  if (flag.killSwitch) {
    return { enabled: false, reason: "kill_switch", flag };
  }

  // Status check
  if (flag.status === "disabled") {
    return { enabled: false, reason: "disabled", flag };
  }

  if (flag.status === "degraded") {
    return { enabled: true, reason: "degraded", flag };
  }

  // Percentage rollout (deterministic based on userId)
  if (flag.enabledPercentage < 100 && userId) {
    const hash = simpleHash(userId + featureId);
    const bucket = hash % 100;
    if (bucket >= flag.enabledPercentage) {
      return { enabled: false, reason: "percentage_rollout", flag };
    }
  }

  return { enabled: true, reason: "enabled", flag };
}

/**
 * Update a feature flag
 */
export function updateFlag(
  featureId: KnownFeatureFlag,
  update: FeatureFlagUpdate,
): FeatureFlag | null {
  const flag = flagCache.get(featureId);
  if (!flag) {
    logger.warn("Attempted to update unknown flag", { featureId });
    return null;
  }

  const updated: FeatureFlag = {
    ...flag,
    ...(update.status !== undefined && { status: update.status }),
    ...(update.enabledPercentage !== undefined && {
      enabledPercentage: Math.min(100, Math.max(0, update.enabledPercentage)),
    }),
    ...(update.killSwitch !== undefined && { killSwitch: update.killSwitch }),
    ...(update.metadata && {
      metadata: { ...flag.metadata, ...update.metadata },
    }),
    updatedAt: new Date(),
    updatedBy: update.updatedBy,
  };

  flagCache.set(featureId, updated);

  logger.info("Feature flag updated", {
    featureId,
    status: updated.status,
    killSwitch: updated.killSwitch,
    updatedBy: update.updatedBy,
  });

  return updated;
}

/**
 * Activate kill-switch for a feature
 */
export function activateKillSwitch(
  featureId: KnownFeatureFlag,
  reason: string,
  updatedBy?: string,
): void {
  updateFlag(featureId, { killSwitch: true, updatedBy });
  logger.error("Kill-switch activated", { featureId, reason, updatedBy });
}

/**
 * Deactivate kill-switch for a feature
 */
export function deactivateKillSwitch(
  featureId: KnownFeatureFlag,
  updatedBy?: string,
): void {
  updateFlag(featureId, { killSwitch: false, updatedBy });
  logger.info("Kill-switch deactivated", { featureId, updatedBy });
}

/**
 * Get/set global kill-switch
 */
export function setGlobalKillSwitch(enabled: boolean, reason?: string): void {
  globalKillSwitch = enabled;
  if (enabled) {
    logger.error("GLOBAL kill-switch activated", { reason });
  } else {
    logger.info("GLOBAL kill-switch deactivated");
  }
}

export function isGlobalKillSwitchActive(): boolean {
  return globalKillSwitch;
}

/**
 * Get all flags
 */
export function getAllFlags(): FeatureFlag[] {
  return Array.from(flagCache.values());
}

/**
 * Get a single flag
 */
export function getFlag(featureId: KnownFeatureFlag): FeatureFlag | undefined {
  return flagCache.get(featureId);
}

/**
 * Set flag status
 */
export function setFlagStatus(
  featureId: KnownFeatureFlag,
  status: FeatureFlagStatus,
  updatedBy?: string,
): FeatureFlag | null {
  return updateFlag(featureId, { status, updatedBy });
}

// Simple hash function for deterministic percentage rollout
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Auto-initialize on import
initializeFlags();
