import { prisma } from '@/lib/db';

export interface TrendPoint {
  dimension: string;
  score: number;
  runDate: Date;
}

export interface RegressionAlert {
  dimension: string;
  latestScore: number;
  rollingAverage: number;
  dropPercent: number;
}

interface ExperimentScores {
  id: string;
  status: string;
  maestroId: string;
  syntheticProfileId: string;
  completedAt: Date | null;
  scoreScaffolding: number | null;
  scoreHinting: number | null;
  scoreAdaptation: number | null;
  scoreMisconceptionHandling: number | null;
}

export async function recordBenchmarkTrend(experimentId: string): Promise<number> {
  const experiment = await prisma.researchExperiment.findUnique({
    where: { id: experimentId },
    select: {
      id: true,
      status: true,
      maestroId: true,
      syntheticProfileId: true,
      completedAt: true,
      scoreScaffolding: true,
      scoreHinting: true,
      scoreAdaptation: true,
      scoreMisconceptionHandling: true,
    },
  });

  if (!experiment) {
    throw new Error(`Experiment not found: ${experimentId}`);
  }

  const completedExperiment = experiment as ExperimentScores;
  if (completedExperiment.status !== 'completed') {
    throw new Error(`Experiment ${experimentId} is ${completedExperiment.status}, expected completed`);
  }

  const runDate = completedExperiment.completedAt ?? new Date();
  const dimensions: Array<{ dimension: string; score: number | null }> = [
    { dimension: 'scaffolding', score: completedExperiment.scoreScaffolding },
    { dimension: 'hinting', score: completedExperiment.scoreHinting },
    { dimension: 'adaptation', score: completedExperiment.scoreAdaptation },
    {
      dimension: 'misconceptionHandling',
      score: completedExperiment.scoreMisconceptionHandling,
    },
  ];

  let inserted = 0;
  for (const entry of dimensions) {
    if (entry.score === null) continue;
    await prisma.$executeRaw`
      INSERT INTO "BenchmarkTrend" ("maestroId", "profileId", "dimension", "score", "runDate", "experimentId")
      VALUES (
        ${completedExperiment.maestroId},
        ${completedExperiment.syntheticProfileId},
        ${entry.dimension},
        ${entry.score},
        ${runDate},
        ${completedExperiment.id}
      )
    `;
    inserted++;
  }

  return inserted;
}

export async function getTrends(maestroId: string, days: number): Promise<TrendPoint[]> {
  if (days <= 0) {
    throw new Error('days must be greater than 0');
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<Array<{ dimension: string; score: number; runDate: Date }>>`
    SELECT "dimension", "score", "runDate"
    FROM "BenchmarkTrend"
    WHERE "maestroId" = ${maestroId}
      AND "runDate" >= ${since}
    ORDER BY "runDate" ASC
  `;

  return rows
    .map((row) => ({
      dimension: row.dimension,
      score: Number(row.score),
      runDate: row.runDate,
    }))
    .sort((a, b) => a.runDate.getTime() - b.runDate.getTime());
}

export async function detectRegression(
  maestroId: string,
  threshold: number,
): Promise<RegressionAlert[]> {
  if (threshold < 0) {
    throw new Error('threshold must be >= 0');
  }

  const trends = await getTrends(maestroId, 7);
  const grouped = new Map<string, TrendPoint[]>();

  for (const trend of trends) {
    const points = grouped.get(trend.dimension) ?? [];
    points.push(trend);
    grouped.set(trend.dimension, points);
  }

  const regressions: RegressionAlert[] = [];
  for (const [dimension, points] of grouped.entries()) {
    if (points.length < 2) continue;

    const sortedPoints = [...points].sort((a, b) => a.runDate.getTime() - b.runDate.getTime());
    const latest = sortedPoints[sortedPoints.length - 1];
    const historical = sortedPoints.slice(0, -1);
    const rollingAverage = historical.reduce((sum, point) => sum + point.score, 0) / historical.length;
    if (rollingAverage <= 0) continue;

    const dropPercent = ((rollingAverage - latest.score) / rollingAverage) * 100;
    if (dropPercent > threshold) {
      regressions.push({
        dimension,
        latestScore: latest.score,
        rollingAverage,
        dropPercent,
      });
    }
  }

  return regressions.sort((a, b) => b.dropPercent - a.dropPercent);
}
