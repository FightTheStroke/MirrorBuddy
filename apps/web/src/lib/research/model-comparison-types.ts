/**
 * Type definitions for model comparison benchmarks.
 */

import type { TutorBenchScores } from './benchmarks';
import type { SimulationSummary } from './simulation-engine';
import type { SafetyBenchmarkResult } from './safety-benchmark';

export interface ModelComparisonConfig {
  models: string[];
  maestroIds: string[];
  profileNames: string[];
  turns: number;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ModelResult {
  model: string;
  maestroId: string;
  profileName: string;
  tutorBenchScores: TutorBenchScores;
  simulationSummary: SimulationSummary;
  safetyResults: SafetyBenchmarkResult;
}

export interface ModelComparisonResult {
  config: ModelComparisonConfig;
  startedAt: Date;
  completedAt: Date;
  modelResults: ModelResult[];
  safetyBaseline: SafetyBenchmarkResult;
}

/**
 * Available Azure OpenAI model deployments for comparison.
 */
export const AVAILABLE_MODELS = [
  'gpt-5-nano',
  'gpt-5-mini',
  'gpt-5',
  'gpt-5-turbo',
  'gpt-5.1',
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number];
