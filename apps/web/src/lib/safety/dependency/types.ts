/**
 * Dependency Detection System - Type Definitions
 * Reference: Amodei "The Adolescence of Technology" (2026)
 */

export type AlertType =
  | "excessive_usage"
  | "emotional_venting"
  | "ai_preference"
  | "night_usage";

export type AlertSeverity = "warning" | "concern" | "critical";

export const DEPENDENCY_THRESHOLDS = {
  MINUTES_WARNING: 120,
  MINUTES_CONCERN: 180,
  MINUTES_CRITICAL: 240,
  SESSIONS_WARNING: 8,
  SESSIONS_CONCERN: 12,
  SESSIONS_CRITICAL: 20,
  NIGHT_PERCENT_WARNING: 20,
  NIGHT_PERCENT_CONCERN: 35,
  NIGHT_PERCENT_CRITICAL: 50,
  EMOTIONAL_VENTS_WARNING: 3,
  EMOTIONAL_VENTS_CONCERN: 5,
  EMOTIONAL_VENTS_CRITICAL: 10,
  AI_PREFERENCE_WARNING: 2,
  AI_PREFERENCE_CONCERN: 4,
  AI_PREFERENCE_CRITICAL: 7,
  SIGMA_WARNING: 2.5,
} as const;

export interface UsageMetrics {
  userId: string;
  date: Date;
  sessionCount: number;
  totalMinutes: number;
  messageCount: number;
  emotionalVentCount: number;
  aiPreferenceCount: number;
  nightMinutes: number;
}

export interface DependencyAlertInput {
  userId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  sigmaDeviation?: number;
  triggerValue?: number;
  threshold?: number;
  description?: string;
  details?: Record<string, unknown>;
}

export interface PatternAnalysisResult {
  userId: string;
  weekdayAverage: number;
  stdDeviation: number;
  isAnomaly: boolean;
  sigmaDeviation: number;
  alerts: DependencyAlertInput[];
}

export const EMOTIONAL_VENTING_PATTERNS = [
  /mi sento solo/i,
  /nessuno mi capisce/i,
  /non ho amici/i,
  /sono sempre solo/i,
  /sono frustrat[oa]/i,
  /non ce la faccio/i,
  /sono ansiois[oa]/i,
  /ho paura/i,
  /sono triste/i,
  /i feel lonely/i,
  /nobody understands me/i,
  /i'm frustrated/i,
  /i'm anxious/i,
  /i'm sad/i,
] as const;

export const AI_PREFERENCE_PATTERNS = [
  /preferisco parlare con te/i,
  /sei l'unico che mi capisce/i,
  /non voglio parlare con persone reali/i,
  /tu sei meglio dei miei amici/i,
  /tu sei meglio dei miei genitori/i,
  /i prefer talking to you/i,
  /you're the only one who understands/i,
  /you're better than my friends/i,
] as const;

export interface EmotionalAnalysisResult {
  hasEmotionalVenting: boolean;
  hasAIPreference: boolean;
  emotionalPatterns: string[];
  preferencePatterns: string[];
}
