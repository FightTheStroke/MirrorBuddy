/**
 * Model comparison orchestrator.
 * Runs experiments across multiple models × maestros × profiles
 * and collects TutorBench scores for side-by-side comparison.
 */

import { getMaestroById } from '@/data';
import { getProfileByName } from './synthetic-students';
import { createExperiment, runExperiment } from './experiment-service';
import { runSafetyBenchmark } from './safety-benchmark';
import type {
  ModelComparisonConfig,
  ModelComparisonResult,
  ModelResult,
} from './model-comparison-types';
import type { TutorBenchScores } from './benchmarks';
import type { SimulationSummary } from './simulation-engine';
import type { SafetyBenchmarkResult } from './safety-benchmark';

const DEFAULT_SCORES: TutorBenchScores = {
  scaffolding: 0,
  hinting: 0,
  adaptation: 0,
  misconceptionHandling: 0,
  overall: 0,
  details: [],
};

const DEFAULT_SUMMARY: SimulationSummary = {
  experimentId: '',
  turnsCompleted: 0,
  totalTokens: 0,
  avgResponseTimeMs: 0,
  status: 'failed',
  error: 'Experiment did not complete',
};

const EMPTY_SAFETY: SafetyBenchmarkResult = {
  totalScenarios: 0,
  passed: 0,
  failed: 0,
  results: [],
};

/**
 * Run model comparison across all model × maestro × profile combinations.
 */
export async function runModelComparison(
  config: ModelComparisonConfig,
): Promise<ModelComparisonResult> {
  const startedAt = new Date();

  // 1. Run safety benchmark once as baseline
  const safetyBaseline = runSafetyBenchmark();

  // 2. Run experiments for each model × maestro × profile combo
  const modelResults: ModelResult[] = [];

  for (const model of config.models) {
    for (const maestroId of config.maestroIds) {
      for (const profileName of config.profileNames) {
        const result = await runSingleComparison(model, maestroId, profileName, config);
        modelResults.push(result);
      }
    }
  }

  return {
    config,
    startedAt,
    completedAt: new Date(),
    modelResults,
    safetyBaseline,
  };
}

async function runSingleComparison(
  model: string,
  maestroId: string,
  profileName: string,
  config: ModelComparisonConfig,
): Promise<ModelResult> {
  const maestro = getMaestroById(maestroId);
  if (!maestro) {
    return {
      model,
      maestroId,
      profileName,
      tutorBenchScores: DEFAULT_SCORES,
      simulationSummary: {
        ...DEFAULT_SUMMARY,
        error: `Maestro not found: ${maestroId}`,
      },
      safetyResults: EMPTY_SAFETY,
    };
  }

  const profile = getProfileByName(profileName);
  if (!profile) {
    return {
      model,
      maestroId,
      profileName,
      tutorBenchScores: DEFAULT_SCORES,
      simulationSummary: {
        ...DEFAULT_SUMMARY,
        error: `Profile not found: ${profileName}`,
      },
      safetyResults: EMPTY_SAFETY,
    };
  }

  try {
    const { id: experimentId } = await createExperiment({
      name: `compare-${model}-${maestroId}-${profileName}`,
      hypothesis: `Model ${model} performance with ${maestroId} and ${profileName}`,
      maestroId,
      syntheticProfileId: profile.name,
      turns: config.turns,
      topic: config.topic ?? maestro.subject,
      difficulty: config.difficulty ?? 'medium',
    });

    const experimentResult = await runExperiment(experimentId, { model });

    return {
      model,
      maestroId,
      profileName,
      tutorBenchScores: experimentResult.scores ?? DEFAULT_SCORES,
      simulationSummary: experimentResult,
      safetyResults: runSafetyBenchmark(),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      model,
      maestroId,
      profileName,
      tutorBenchScores: DEFAULT_SCORES,
      simulationSummary: {
        ...DEFAULT_SUMMARY,
        error: errorMsg,
      },
      safetyResults: EMPTY_SAFETY,
    };
  }
}
