/**
 * Adaptive Difficulty Engine - Main module
 * Database operations and public API
 */

import { prisma } from "@/lib/db";
import type {
  AdaptiveContext,
  AdaptiveDifficultyMode,
  AdaptiveProfile,
  AdaptiveSignalInput,
} from "@/types";

// Re-export core functions
export {
  isAdaptiveDifficultyMode,
  normalizeAdaptiveDifficultyMode,
  calculateAdaptiveContext,
  buildAdaptiveInstruction,
} from "./adaptive-difficulty-core";

// Re-export profile functions
export {
  createDefaultAdaptiveProfile,
  parseAdaptiveProfile,
} from "./adaptive-difficulty-profile";

// Internal imports for this module
import {
  normalizeAdaptiveDifficultyMode,
  calculateAdaptiveContext,
} from "./adaptive-difficulty-core";
import {
  parseAdaptiveProfile,
  updateGlobalSignals,
  updateSubjectSignals,
  ensureSubjectProfile,
  isSafeSubjectKey,
} from "./adaptive-difficulty-profile";

export async function loadAdaptiveProfile(
  userId: string,
): Promise<AdaptiveProfile> {
  let progress = await prisma.progress.findUnique({ where: { userId } });
  if (!progress) {
    progress = await prisma.progress.create({ data: { userId } });
  }
  return parseAdaptiveProfile(progress.adaptiveProfile);
}

export async function saveAdaptiveProfile(
  userId: string,
  profile: AdaptiveProfile,
): Promise<void> {
  await prisma.progress.update({
    where: { userId },
    data: { adaptiveProfile: JSON.stringify(profile) },
  });
}

export async function recordAdaptiveSignal(
  userId: string,
  signal: AdaptiveSignalInput,
): Promise<AdaptiveProfile> {
  const profile = await loadAdaptiveProfile(userId);
  updateGlobalSignals(profile, signal);
  updateSubjectSignals(profile, signal);

  // Only update subject-specific data if subject key is safe (prevent prototype pollution)
  if (signal.subject && isSafeSubjectKey(signal.subject)) {
    const context = calculateAdaptiveContext(profile, {
      mode: signal.mode ?? "balanced",
      subject: signal.subject,
      baselineDifficulty: signal.baselineDifficulty,
    });
    const subjectProfile = ensureSubjectProfile(profile, signal.subject);
    if (subjectProfile) {
      subjectProfile.targetDifficulty = context.targetDifficulty;
    }
  }

  await saveAdaptiveProfile(userId, profile);
  return profile;
}

export async function getAdaptiveContextForUser(
  userId: string,
  options: {
    subject?: string;
    baselineDifficulty?: number;
    pragmatic?: boolean;
    modeOverride?: AdaptiveDifficultyMode;
  },
): Promise<AdaptiveContext> {
  const [profile, settings] = await Promise.all([
    loadAdaptiveProfile(userId),
    prisma.settings.findUnique({
      where: { userId },
      select: { adaptiveDifficultyMode: true },
    }),
  ]);

  const mode = normalizeAdaptiveDifficultyMode(
    options.modeOverride ?? settings?.adaptiveDifficultyMode,
  );
  return calculateAdaptiveContext(profile, {
    mode,
    subject: options.subject,
    baselineDifficulty: options.baselineDifficulty,
    pragmatic: options.pragmatic,
  });
}

/**
 * Batch record multiple adaptive signals with a single DB load/save
 * Avoids N+1 queries when processing multiple signals
 */
export async function recordAdaptiveSignalsBatch(
  userId: string,
  signals: AdaptiveSignalInput[],
): Promise<AdaptiveProfile> {
  if (signals.length === 0) {
    return loadAdaptiveProfile(userId);
  }

  // Load profile once
  const profile = await loadAdaptiveProfile(userId);

  // Process all signals in memory
  for (const signal of signals) {
    updateGlobalSignals(profile, signal);
    updateSubjectSignals(profile, signal);

    // Only update subject-specific data if subject key is safe (prevent prototype pollution)
    if (signal.subject && isSafeSubjectKey(signal.subject)) {
      const context = calculateAdaptiveContext(profile, {
        mode: signal.mode ?? "balanced",
        subject: signal.subject,
        baselineDifficulty: signal.baselineDifficulty,
      });
      const subjectProfile = ensureSubjectProfile(profile, signal.subject);
      if (subjectProfile) {
        subjectProfile.targetDifficulty = context.targetDifficulty;
      }
    }
  }

  // Save profile once
  await saveAdaptiveProfile(userId, profile);
  return profile;
}
