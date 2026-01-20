/**
 * Feature Flags Service
 *
 * V1Plan FASE 2.0.6: Centralized feature flag management
 * - Prisma persistence for production reliability
 * - In-memory cache for performance
 * - Kill-switch support for emergency disabling
 * - Percentage-based rollout
 * - Graceful degradation hooks
 */

import { prisma } from "@/lib/db";
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

// In-memory cache for performance
const flagCache = new Map<string, FeatureFlag>();
let globalKillSwitch = false;
let globalKillSwitchReason: string | undefined;
let initialized = false;

/**
 * Initialize flags from database, seeding defaults if needed
 */
export async function initializeFlags(): Promise<void> {
  if (initialized) return;

  try {
    // Load global config
    const globalConfig = await prisma.globalConfig.findUnique({
      where: { id: "global" },
    });

    if (globalConfig) {
      globalKillSwitch = globalConfig.killSwitch;
      globalKillSwitchReason = globalConfig.killSwitchReason ?? undefined;
    }

    // Load existing flags from DB
    const dbFlags = await prisma.featureFlag.findMany();
    const dbFlagMap = new Map(dbFlags.map((f) => [f.id, f]));

    // Seed missing flags and populate cache
    for (const [id, config] of Object.entries(DEFAULT_FLAGS)) {
      const existing = dbFlagMap.get(id);

      if (existing) {
        // Use DB value
        flagCache.set(id, {
          id: existing.id,
          name: existing.name,
          description: existing.description,
          status: existing.status as FeatureFlagStatus,
          enabledPercentage: existing.enabledPercentage,
          killSwitch: existing.killSwitch,
          metadata: existing.metadata as Record<string, unknown> | undefined,
          updatedAt: existing.updatedAt,
          updatedBy: existing.updatedBy ?? undefined,
        });
      } else {
        // Seed to DB and cache
        const newFlag = await prisma.featureFlag.create({
          data: {
            id,
            name: config.name,
            description: config.description,
            status: config.status,
            enabledPercentage: config.enabledPercentage,
            killSwitch: config.killSwitch,
          },
        });

        flagCache.set(id, {
          id: newFlag.id,
          name: newFlag.name,
          description: newFlag.description,
          status: newFlag.status as FeatureFlagStatus,
          enabledPercentage: newFlag.enabledPercentage,
          killSwitch: newFlag.killSwitch,
          updatedAt: newFlag.updatedAt,
        });
      }
    }

    // Ensure global config exists
    if (!globalConfig) {
      await prisma.globalConfig.create({
        data: { id: "global", killSwitch: false },
      });
    }

    initialized = true;
    logger.info("Feature flags initialized from database", {
      count: flagCache.size,
    });
  } catch (error) {
    // Fallback to in-memory defaults if DB unavailable
    logger.error(
      "Failed to load flags from DB, using defaults",
      undefined,
      error,
    );
    initializeFlagsSync();
  }
}

/**
 * Synchronous initialization (fallback when DB unavailable)
 */
function initializeFlagsSync(): void {
  const now = new Date();
  for (const [id, config] of Object.entries(DEFAULT_FLAGS)) {
    flagCache.set(id, { id, ...config, updatedAt: now });
  }
  initialized = true;
  logger.warn("Feature flags initialized from defaults (no DB)");
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  featureId: KnownFeatureFlag,
  userId?: string,
): FeatureFlagCheckResult {
  // Ensure initialized (sync fallback)
  if (!initialized) initializeFlagsSync();

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
 * Update a feature flag (persists to DB)
 */
export async function updateFlag(
  featureId: KnownFeatureFlag,
  update: FeatureFlagUpdate,
): Promise<FeatureFlag | null> {
  // Ensure initialized (sync fallback for tests)
  if (!initialized) initializeFlagsSync();

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

  // Update cache immediately
  flagCache.set(featureId, updated);

  // Persist to DB (upsert for robustness when record doesn't exist yet)
  try {
    const dbData = {
      status: updated.status,
      enabledPercentage: updated.enabledPercentage,
      killSwitch: updated.killSwitch,
      killSwitchReason: update.killSwitch
        ? (update.metadata?.reason as string)
        : null,
      metadata: updated.metadata
        ? JSON.parse(JSON.stringify(updated.metadata))
        : undefined,
      updatedBy: update.updatedBy,
    };

    await prisma.featureFlag.upsert({
      where: { id: featureId },
      update: dbData,
      create: {
        id: featureId,
        name: updated.name,
        description: updated.description,
        ...dbData,
      },
    });
  } catch (error) {
    logger.error("Failed to persist flag update", { featureId }, error);
    // Cache is still updated - will sync on next restart
  }

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
export async function activateKillSwitch(
  featureId: KnownFeatureFlag,
  reason: string,
  updatedBy?: string,
): Promise<void> {
  await updateFlag(featureId, {
    killSwitch: true,
    metadata: { reason },
    updatedBy,
  });
  logger.error("Kill-switch activated", { featureId, reason, updatedBy });
}

/**
 * Deactivate kill-switch for a feature
 */
export async function deactivateKillSwitch(
  featureId: KnownFeatureFlag,
  updatedBy?: string,
): Promise<void> {
  await updateFlag(featureId, { killSwitch: false, updatedBy });
  logger.info("Kill-switch deactivated", { featureId, updatedBy });
}

/**
 * Set global kill-switch (persists to DB)
 */
export async function setGlobalKillSwitch(
  enabled: boolean,
  reason?: string,
): Promise<void> {
  globalKillSwitch = enabled;
  globalKillSwitchReason = reason;

  try {
    await prisma.globalConfig.upsert({
      where: { id: "global" },
      update: { killSwitch: enabled, killSwitchReason: reason },
      create: { id: "global", killSwitch: enabled, killSwitchReason: reason },
    });
  } catch (error) {
    logger.error("Failed to persist global kill-switch", undefined, error);
  }

  if (enabled) {
    logger.error("GLOBAL kill-switch activated", { reason });
  } else {
    logger.info("GLOBAL kill-switch deactivated");
  }
}

export function isGlobalKillSwitchActive(): boolean {
  return globalKillSwitch;
}

export function getGlobalKillSwitchReason(): string | undefined {
  return globalKillSwitchReason;
}

/**
 * Get all flags
 */
export function getAllFlags(): FeatureFlag[] {
  if (!initialized) initializeFlagsSync();
  return Array.from(flagCache.values());
}

/**
 * Get a single flag
 */
export function getFlag(featureId: KnownFeatureFlag): FeatureFlag | undefined {
  if (!initialized) initializeFlagsSync();
  return flagCache.get(featureId);
}

/**
 * Set flag status
 */
export async function setFlagStatus(
  featureId: KnownFeatureFlag,
  status: FeatureFlagStatus,
  updatedBy?: string,
): Promise<FeatureFlag | null> {
  return updateFlag(featureId, { status, updatedBy });
}

/**
 * Reload flags from database (useful after external changes)
 */
export async function reloadFlags(): Promise<void> {
  initialized = false;
  flagCache.clear();
  await initializeFlags();
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

/**
 * Reset state (for testing only)
 */
export function _resetForTesting(): void {
  flagCache.clear();
  globalKillSwitch = false;
  globalKillSwitchReason = undefined;
  initialized = false;
}
