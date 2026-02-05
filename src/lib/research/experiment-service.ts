/**
 * Experiment lifecycle management for the Research Lab.
 * Create, run, and compare experiments across synthetic profiles and maestri.
 */

import { prisma } from "@/lib/db";
import type { ResearchResult, ResearchExperiment } from "@prisma/client";
import { getMaestroById } from "@/data/maestri-list";
import { SYNTHETIC_PROFILES } from "./synthetic-students";
import { runSimulation, type SimulationSummary } from "./simulation-engine";
import { scoreTutorBench, type TutorBenchScores } from "./benchmarks";

export interface ExperimentInput {
  name: string;
  hypothesis: string;
  maestroId: string;
  syntheticProfileId: string;
  turns?: number;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface ExperimentWithScores {
  id: string;
  name: string;
  hypothesis: string;
  maestroId: string;
  status: string;
  scores: {
    scaffolding: number | null;
    hinting: number | null;
    adaptation: number | null;
    misconceptionHandling: number | null;
  };
  turnsCompleted: number;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ComparisonResult {
  experiments: ExperimentWithScores[];
  bestOverall: string | null;
  dimensionWinners: Record<string, string>;
}

/**
 * Create a new experiment in DRAFT status.
 */
export async function createExperiment(
  input: ExperimentInput,
): Promise<{ id: string }> {
  const maestro = getMaestroById(input.maestroId);
  if (!maestro) {
    throw new Error(`Maestro not found: ${input.maestroId}`);
  }

  const experiment = await prisma.researchExperiment.create({
    data: {
      name: input.name,
      hypothesis: input.hypothesis,
      maestroId: input.maestroId,
      syntheticProfileId: input.syntheticProfileId,
      turns: input.turns ?? 10,
      config: {
        topic: input.topic ?? maestro.subject,
        difficulty: input.difficulty ?? "medium",
      },
    },
  });

  return { id: experiment.id };
}

/**
 * Run an experiment: execute simulation then score with TutorBench.
 */
export async function runExperiment(
  experimentId: string,
): Promise<SimulationSummary & { scores?: TutorBenchScores }> {
  const experiment = await prisma.researchExperiment.findUnique({
    where: { id: experimentId },
    include: { syntheticProfile: true },
  });

  if (!experiment) throw new Error(`Experiment not found: ${experimentId}`);
  if (experiment.status !== "draft") {
    throw new Error(
      `Experiment ${experimentId} is ${experiment.status}, expected draft`,
    );
  }

  const maestro = getMaestroById(experiment.maestroId);
  if (!maestro) throw new Error(`Maestro not found: ${experiment.maestroId}`);

  // Find matching synthetic profile from code-defined profiles
  const profile = SYNTHETIC_PROFILES.find(
    (p) => p.name === experiment.syntheticProfile.name,
  );
  if (!profile) {
    throw new Error(
      `Synthetic profile not matched: ${experiment.syntheticProfile.name}`,
    );
  }

  const config = (experiment.config ?? {}) as Record<string, string>;

  // 1. Run simulation
  const summary = await runSimulation({
    experimentId,
    profile,
    maestroSystemPrompt: maestro.systemPrompt,
    maestroId: maestro.id,
    topic: config.topic ?? maestro.subject,
    turns: experiment.turns,
    difficulty: (config.difficulty as "easy" | "medium" | "hard") ?? "medium",
  });

  // 2. Score with TutorBench (only if simulation completed)
  let scores: TutorBenchScores | undefined;
  if (summary.status === "completed") {
    const results = await prisma.researchResult.findMany({
      where: { experimentId },
      orderBy: { turn: "asc" },
    });

    const turns = results.map((r: ResearchResult) => ({
      studentMessage: r.studentMessage,
      maestroResponse: r.maestroResponse,
    }));

    scores = await scoreTutorBench(turns, profile.description);

    // Store scores on experiment
    await prisma.researchExperiment.update({
      where: { id: experimentId },
      data: {
        scoreScaffolding: scores.scaffolding,
        scoreHinting: scores.hinting,
        scoreAdaptation: scores.adaptation,
        scoreMisconceptionHandling: scores.misconceptionHandling,
      },
    });
  }

  return { ...summary, scores };
}

/**
 * Get experiment with scores for display.
 */
export async function getExperimentResults(
  experimentId: string,
): Promise<ExperimentWithScores | null> {
  const exp = await prisma.researchExperiment.findUnique({
    where: { id: experimentId },
    include: { _count: { select: { results: true } } },
  });

  if (!exp) return null;

  return {
    id: exp.id,
    name: exp.name,
    hypothesis: exp.hypothesis,
    maestroId: exp.maestroId,
    status: exp.status,
    scores: {
      scaffolding: exp.scoreScaffolding,
      hinting: exp.scoreHinting,
      adaptation: exp.scoreAdaptation,
      misconceptionHandling: exp.scoreMisconceptionHandling,
    },
    turnsCompleted: exp._count.results,
    createdAt: exp.createdAt,
    completedAt: exp.completedAt,
  };
}

/**
 * Compare multiple experiments side-by-side.
 */
export async function compareExperiments(
  experimentIds: string[],
): Promise<ComparisonResult> {
  const experiments: ExperimentWithScores[] = [];

  for (const id of experimentIds) {
    const result = await getExperimentResults(id);
    if (result) experiments.push(result);
  }

  // Find best per dimension
  const dimensions = [
    "scaffolding",
    "hinting",
    "adaptation",
    "misconceptionHandling",
  ] as const;
  const dimensionWinners: Record<string, string> = {};
  let bestOverallId: string | null = null;
  let bestOverallScore = -1;

  for (const dim of dimensions) {
    let best = -1;
    let winnerId = "";
    for (const exp of experiments) {
      const score = exp.scores[dim];
      if (score !== null && score > best) {
        best = score;
        winnerId = exp.id;
      }
    }
    if (winnerId) dimensionWinners[dim] = winnerId;
  }

  for (const exp of experiments) {
    const s = exp.scores;
    const avg =
      [s.scaffolding, s.hinting, s.adaptation, s.misconceptionHandling]
        .filter((v): v is number => v !== null)
        .reduce((a, b) => a + b, 0) / 4;
    if (avg > bestOverallScore) {
      bestOverallScore = avg;
      bestOverallId = exp.id;
    }
  }

  return { experiments, bestOverall: bestOverallId, dimensionWinners };
}

/**
 * List experiments with optional filters.
 */
export async function listExperiments(options?: {
  status?: string;
  maestroId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ExperimentWithScores[]; total: number }> {
  const where: Record<string, string> = {};
  if (options?.status) where.status = options.status;
  if (options?.maestroId) where.maestroId = options.maestroId;

  const [items, total] = await Promise.all([
    prisma.researchExperiment.findMany({
      where,
      include: { _count: { select: { results: true } } },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.researchExperiment.count({ where }),
  ]);

  return {
    items: items.map(
      (exp: ResearchExperiment & { _count: { results: number } }) => ({
        id: exp.id,
        name: exp.name,
        hypothesis: exp.hypothesis,
        maestroId: exp.maestroId,
        status: exp.status,
        scores: {
          scaffolding: exp.scoreScaffolding,
          hinting: exp.scoreHinting,
          adaptation: exp.scoreAdaptation,
          misconceptionHandling: exp.scoreMisconceptionHandling,
        },
        turnsCompleted: exp._count.results,
        createdAt: exp.createdAt,
        completedAt: exp.completedAt,
      }),
    ),
    total,
  };
}
