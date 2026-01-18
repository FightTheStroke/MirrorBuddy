/**
 * Adaptive Difficulty Profile - Profile management and signal processing
 */

import { z } from "zod";
import type { AdaptiveProfile, AdaptiveSignalInput } from "@/types";
import {
  clamp,
  ema,
  DEFAULT_BASELINE_DIFFICULTY,
} from "./adaptive-difficulty-core";

// Zod schema for runtime validation of stored profiles
const AdaptiveGlobalSignalsSchema = z.object({
  frustration: z.number().min(0).max(1),
  repeatRate: z.number().min(0).max(1),
  questionRate: z.number().min(0).max(1),
  averageResponseMs: z.number().min(0),
  lastUpdatedAt: z.string(),
});

const AdaptiveSubjectProfileSchema = z.object({
  mastery: z.number().min(0).max(100),
  targetDifficulty: z.number().min(1).max(5),
  lastUpdatedAt: z.string(),
  lastQuizScore: z.number().optional(),
});

const AdaptiveProfileSchema = z.object({
  global: AdaptiveGlobalSignalsSchema,
  subjects: z.record(z.string(), AdaptiveSubjectProfileSchema),
  updatedAt: z.string(),
});

export function createDefaultAdaptiveProfile(): AdaptiveProfile {
  const now = new Date().toISOString();
  return {
    global: {
      frustration: 0,
      repeatRate: 0,
      questionRate: 0,
      averageResponseMs: 12000,
      lastUpdatedAt: now,
    },
    subjects: {},
    updatedAt: now,
  };
}

export function parseAdaptiveProfile(raw?: string | null): AdaptiveProfile {
  if (!raw || raw === "{}") {
    return createDefaultAdaptiveProfile();
  }

  try {
    const parsed = JSON.parse(raw);
    const validated = AdaptiveProfileSchema.safeParse(parsed);

    if (!validated.success) {
      // Profile is corrupted or outdated schema, return default
      return createDefaultAdaptiveProfile();
    }

    return validated.data;
  } catch {
    // JSON parse failed, return default
    return createDefaultAdaptiveProfile();
  }
}

export function updateGlobalSignals(
  profile: AdaptiveProfile,
  signal: AdaptiveSignalInput,
): void {
  const now = new Date().toISOString();
  const global = profile.global;

  const decay = 0.9;
  global.frustration *= decay;
  global.repeatRate *= decay;
  global.questionRate *= decay;

  switch (signal.type) {
    case "frustration":
      global.frustration = clamp(
        ema(global.frustration, signal.value ?? 1, 0.3),
        0,
        1,
      );
      break;
    case "repeat_request":
      global.repeatRate = clamp(ema(global.repeatRate, 1, 0.3), 0, 1);
      break;
    case "question":
      global.questionRate = clamp(ema(global.questionRate, 1, 0.2), 0, 1);
      break;
    case "response_time_ms": {
      const responseTime = signal.responseTimeMs ?? signal.value ?? 0;
      global.averageResponseMs =
        responseTime > 0
          ? ema(global.averageResponseMs, responseTime, 0.2)
          : global.averageResponseMs;
      break;
    }
    default:
      break;
  }

  global.lastUpdatedAt = now;
  profile.updatedAt = now;
}

export function ensureSubjectProfile(
  profile: AdaptiveProfile,
  subject?: string,
): AdaptiveProfile["subjects"][string] | null {
  if (!subject) return null;
  const key = subject.toLowerCase();
  // Prevent prototype pollution
  if (key === "__proto__" || key === "constructor" || key === "prototype") {
    return null;
  }
  if (!Object.hasOwn(profile.subjects, key)) {
    const now = new Date().toISOString();
    profile.subjects[key] = {
      mastery: 50,
      targetDifficulty: DEFAULT_BASELINE_DIFFICULTY,
      lastUpdatedAt: now,
    };
  }
  return profile.subjects[key];
}

export function updateSubjectSignals(
  profile: AdaptiveProfile,
  signal: AdaptiveSignalInput,
): void {
  const subjectProfile = ensureSubjectProfile(profile, signal.subject);
  if (!subjectProfile) return;

  const now = new Date().toISOString();

  if (signal.type === "quiz_result") {
    const score = clamp(signal.value ?? 0, 0, 100);
    subjectProfile.mastery = clamp(
      ema(subjectProfile.mastery, score, 0.3),
      0,
      100,
    );
    subjectProfile.lastQuizScore = score;
  }

  if (signal.type === "flashcard_rating") {
    const deltaMap: Record<string, number> = {
      again: -6,
      hard: -3,
      good: 2,
      easy: 4,
    };
    const delta = deltaMap[signal.rating || "good"] ?? 0;
    subjectProfile.mastery = clamp(subjectProfile.mastery + delta, 0, 100);
  }

  subjectProfile.lastUpdatedAt = now;
  profile.updatedAt = now;
}
