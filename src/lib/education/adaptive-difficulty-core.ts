/**
 * Adaptive Difficulty Core - Pure calculation functions
 * No side effects, no database operations
 */

import type {
  AdaptiveContext,
  AdaptiveDifficultyMode,
  AdaptiveProfile,
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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function ema(previous: number, current: number, alpha: number): number {
  return previous * (1 - alpha) + current * alpha;
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
    ? 'Riduciamo leggermente la difficoltà per consolidare i prerequisiti.'
    : signals.questionRate > 0.6
      ? 'Puoi affrontare un po\' più di sfida mantenendo chiarezza.'
      : 'Difficoltà calibrata per restare sfidante ma raggiungibile.';

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
    ? 'Modalità pragmatica: completa i compiti ma mantieni spiegazioni chiare e realizzabili.'
    : 'Evita salti di prerequisiti e àncora nuove idee a concetti già noti.';

  return [
    `## Difficoltà adattiva (${modeLabel})`,
    `Target difficoltà: ${context.targetDifficulty}/5 (baseline ${context.baselineDifficulty}/5).`,
    context.reason,
    applyLine,
    pragmaticLine,
    'Se emergono lacune, verifica i prerequisiti con 1-2 domande prima di avanzare.',
    `Vincoli: min ${context.constraints.minDifficulty}/5, max ${context.constraints.maxDifficulty}/5.`,
    'Mantieni sempre la zona "challenging ma achievable".',
  ].join('\n');
}

export { DEFAULT_BASELINE_DIFFICULTY };
