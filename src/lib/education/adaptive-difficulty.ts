import { prisma } from '@/lib/db';
import type {
  AdaptiveContext,
  AdaptiveDifficultyMode,
  AdaptiveProfile,
  AdaptiveSignalInput,
} from '@/types';

const DEFAULT_BASELINE_DIFFICULTY = 3;

const MODE_LIMITS: Record<AdaptiveDifficultyMode, number> = {
  manual: 0,
  guided: 0.5,
  balanced: 1,
  automatic: 1.5,
};

export function isAdaptiveDifficultyMode(
  value: string | null | undefined
): value is AdaptiveDifficultyMode {
  return value === 'manual' || value === 'guided' || value === 'balanced' || value === 'automatic';
}

export function normalizeAdaptiveDifficultyMode(
  value: string | null | undefined,
  fallback: AdaptiveDifficultyMode = 'balanced'
): AdaptiveDifficultyMode {
  return isAdaptiveDifficultyMode(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function ema(previous: number, current: number, alpha: number): number {
  return previous * (1 - alpha) + current * alpha;
}

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
  if (!raw) return createDefaultAdaptiveProfile();
  const parsed = JSON.parse(raw) as AdaptiveProfile;
  if (!parsed.global || !parsed.subjects) {
    throw new Error('Adaptive profile JSON missing required fields');
  }
  return parsed;
}

export function calculateAdaptiveContext(
  profile: AdaptiveProfile,
  options: {
    mode: AdaptiveDifficultyMode;
    subject?: string;
    baselineDifficulty?: number;
    pragmatic?: boolean;
  }
): AdaptiveContext {
  const baselineDifficulty = clamp(
    options.baselineDifficulty ?? DEFAULT_BASELINE_DIFFICULTY,
    1,
    5
  );
  const subjectKey = options.subject?.toLowerCase();
  const subjectProfile = subjectKey ? profile.subjects[subjectKey] : undefined;
  const mastery = subjectProfile?.mastery ?? 50;
  const pragmatic = options.pragmatic ?? false;

  const maxDifficulty =
    mastery < 40 ? 2.5 : mastery < 60 ? 3.5 : mastery < 80 ? 4.5 : 5;
  const minDifficulty =
    mastery < 40 ? 1.5 : mastery < 60 ? 2 : 2.5;

  const signals = profile.global;
  let adjustment = 0;

  if (signals.frustration > 0.6) {
    adjustment -= 1;
  } else {
    adjustment -= signals.frustration * 0.8;
  }

  if (signals.repeatRate > 0.4) {
    adjustment -= 0.5;
  }

  if (signals.questionRate > 0.6 && signals.frustration < 0.4) {
    adjustment += 0.5;
  }

  if (signals.averageResponseMs > 20000) {
    adjustment -= 0.5;
  } else if (signals.averageResponseMs > 0 && signals.averageResponseMs < 7000) {
    adjustment += 0.3;
  }

  const limit = MODE_LIMITS[options.mode];
  adjustment = clamp(adjustment, -limit, limit);

  if (pragmatic && adjustment < -0.5) {
    adjustment = -0.5;
  }

  const targetDifficulty = clamp(
    roundToHalf(baselineDifficulty + adjustment),
    minDifficulty,
    maxDifficulty
  );

  const apply = options.mode !== 'manual';
  const reason = signals.frustration > 0.6 || signals.repeatRate > 0.4
    ? 'Riduciamo leggermente la difficolta per consolidare i prerequisiti.'
    : signals.questionRate > 0.6
      ? 'Puoi affrontare un po\' piu di sfida mantenendo chiarezza.'
      : 'Difficolta calibrata per restare sfidante ma raggiungibile.';

  return {
    mode: options.mode,
    subject: options.subject,
    baselineDifficulty,
    targetDifficulty,
    apply,
    reason,
    pragmatic,
    constraints: { minDifficulty, maxDifficulty },
  };
}

export function buildAdaptiveInstruction(context: AdaptiveContext): string {
  const modeLabel = {
    manual: 'Manuale',
    guided: 'Guidata',
    balanced: 'Bilanciata',
    automatic: 'Automatica',
  }[context.mode];

  const applyLine = context.apply
    ? 'Applica direttamente gli aggiustamenti quando serve.'
    : 'Suggerisci gli aggiustamenti e chiedi conferma prima di cambiare livello.';
  const pragmaticLine = context.pragmatic
    ? 'Modalita pragmatica: completa i compiti ma mantieni spiegazioni chiare e realizzabili.'
    : 'Evita salti di prerequisiti e ancora nuove idee a concetti gia noti.';

  return [
    `## Difficolta adattiva (${modeLabel})`,
    `Target difficolta: ${context.targetDifficulty}/5 (baseline ${context.baselineDifficulty}/5).`,
    context.reason,
    applyLine,
    pragmaticLine,
    'Se emergono lacune, verifica i prerequisiti con 1-2 domande prima di avanzare.',
    `Vincoli: min ${context.constraints.minDifficulty}/5, max ${context.constraints.maxDifficulty}/5.`,
    'Mantieni sempre la zona "challenging ma achievable".',
  ].join('\n');
}

function updateGlobalSignals(profile: AdaptiveProfile, signal: AdaptiveSignalInput): void {
  const now = new Date().toISOString();
  const global = profile.global;

  const decay = 0.9;
  global.frustration *= decay;
  global.repeatRate *= decay;
  global.questionRate *= decay;

  switch (signal.type) {
    case 'frustration':
      global.frustration = clamp(ema(global.frustration, signal.value ?? 1, 0.3), 0, 1);
      break;
    case 'repeat_request':
      global.repeatRate = clamp(ema(global.repeatRate, 1, 0.3), 0, 1);
      break;
    case 'question':
      global.questionRate = clamp(ema(global.questionRate, 1, 0.2), 0, 1);
      break;
    case 'response_time_ms': {
      const responseTime = signal.responseTimeMs ?? signal.value ?? 0;
      global.averageResponseMs = responseTime > 0
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

function ensureSubjectProfile(profile: AdaptiveProfile, subject?: string): AdaptiveProfile['subjects'][string] | null {
  if (!subject) return null;
  const key = subject.toLowerCase();
  if (!profile.subjects[key]) {
    const now = new Date().toISOString();
    profile.subjects[key] = {
      mastery: 50,
      targetDifficulty: DEFAULT_BASELINE_DIFFICULTY,
      lastUpdatedAt: now,
    };
  }
  return profile.subjects[key];
}

function updateSubjectSignals(profile: AdaptiveProfile, signal: AdaptiveSignalInput): void {
  const subjectProfile = ensureSubjectProfile(profile, signal.subject);
  if (!subjectProfile) return;

  const now = new Date().toISOString();

  if (signal.type === 'quiz_result') {
    const score = clamp(signal.value ?? 0, 0, 100);
    subjectProfile.mastery = clamp(ema(subjectProfile.mastery, score, 0.3), 0, 100);
    subjectProfile.lastQuizScore = score;
  }

  if (signal.type === 'flashcard_rating') {
    const deltaMap: Record<string, number> = {
      again: -6,
      hard: -3,
      good: 2,
      easy: 4,
    };
    const delta = deltaMap[signal.rating || 'good'] ?? 0;
    subjectProfile.mastery = clamp(subjectProfile.mastery + delta, 0, 100);
  }

  subjectProfile.lastUpdatedAt = now;
  profile.updatedAt = now;
}

export async function loadAdaptiveProfile(userId: string): Promise<AdaptiveProfile> {
  let progress = await prisma.progress.findUnique({ where: { userId } });
  if (!progress) {
    progress = await prisma.progress.create({ data: { userId } });
  }
  return parseAdaptiveProfile(progress.adaptiveProfile);
}

export async function saveAdaptiveProfile(
  userId: string,
  profile: AdaptiveProfile
): Promise<void> {
  await prisma.progress.update({
    where: { userId },
    data: { adaptiveProfile: JSON.stringify(profile) },
  });
}

export async function recordAdaptiveSignal(
  userId: string,
  signal: AdaptiveSignalInput
): Promise<AdaptiveProfile> {
  const profile = await loadAdaptiveProfile(userId);
  updateGlobalSignals(profile, signal);
  updateSubjectSignals(profile, signal);

  if (signal.subject) {
    const context = calculateAdaptiveContext(profile, {
      mode: signal.mode ?? 'balanced',
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
  }
): Promise<AdaptiveContext> {
  const [profile, settings] = await Promise.all([
    loadAdaptiveProfile(userId),
    prisma.settings.findUnique({ where: { userId }, select: { adaptiveDifficultyMode: true } }),
  ]);

  const mode = normalizeAdaptiveDifficultyMode(options.modeOverride ?? settings?.adaptiveDifficultyMode);
  return calculateAdaptiveContext(profile, {
    mode,
    subject: options.subject,
    baselineDifficulty: options.baselineDifficulty,
    pragmatic: options.pragmatic,
  });
}
