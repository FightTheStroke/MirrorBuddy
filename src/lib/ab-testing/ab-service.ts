import { prisma } from '@/lib/db';
import { assignBucket, type BucketRanges } from './bucketing';

const ACTIVE_EXPERIMENTS_TTL_MS = 60_000;

interface ABBucketConfigRecord {
  bucketLabel: string;
  percentage: number;
  modelProvider: string;
  modelName: string;
  extraConfig: unknown;
}

interface ABExperimentRecord {
  id: string;
  status: string;
  bucketConfigs: ABBucketConfigRecord[];
}

interface ABExperimentModel {
  findMany(args: {
    where: { status: string };
    include: { bucketConfigs: true };
  }): Promise<ABExperimentRecord[]>;
  findUnique(args: {
    where: { id: string };
    include: { bucketConfigs: true };
  }): Promise<ABExperimentRecord | null>;
}

interface ActiveExperimentsCache {
  value: ABExperimentRecord[];
  expiresAt: number;
}

let activeExperimentsCache: ActiveExperimentsCache | null = null;

export function __resetActiveExperimentsCacheForTests(): void {
  activeExperimentsCache = null;
}

function getABExperimentModel(): ABExperimentModel {
  const model = (prisma as unknown as Record<string, unknown>).aBExperiment as
    | ABExperimentModel
    | undefined;

  if (!model) {
    throw new Error('A/B experiment model is not available on Prisma client');
  }

  return model;
}

function buildBucketRanges(bucketConfigs: ABBucketConfigRecord[]): BucketRanges {
  const ranges: BucketRanges = {};
  const totalWeight = bucketConfigs.reduce((sum, config) => sum + Math.max(config.percentage, 0), 0);

  if (totalWeight <= 0) {
    throw new Error('Experiment bucket percentages must be greater than 0');
  }

  let rangeStart = 0;
  let cumulativeWeight = 0;

  for (let index = 0; index < bucketConfigs.length; index++) {
    const config = bucketConfigs[index];
    cumulativeWeight += Math.max(config.percentage, 0);
    const boundary =
      index === bucketConfigs.length - 1
        ? 100
        : Math.max(rangeStart + 1, Math.round((cumulativeWeight / totalWeight) * 100));

    const rangeEnd = Math.min(99, boundary - 1);
    ranges[config.bucketLabel] = [rangeStart, rangeEnd];
    rangeStart = rangeEnd + 1;

    if (rangeStart > 99) {
      break;
    }
  }

  return ranges;
}

export async function getActiveExperiments(): Promise<ABExperimentRecord[]> {
  const now = Date.now();
  if (activeExperimentsCache && activeExperimentsCache.expiresAt > now) {
    return activeExperimentsCache.value;
  }

  const experiments = await getABExperimentModel().findMany({
    where: { status: 'active' },
    include: { bucketConfigs: true },
  });

  activeExperimentsCache = {
    value: experiments,
    expiresAt: now + ACTIVE_EXPERIMENTS_TTL_MS,
  };

  return experiments;
}

export async function getExperimentConfig(experimentId: string): Promise<ABExperimentRecord | null> {
  if (!experimentId) {
    throw new Error('experimentId is required');
  }

  const cachedActive = await getActiveExperiments();
  const activeMatch = cachedActive.find((experiment) => experiment.id === experimentId);
  if (activeMatch) {
    return activeMatch;
  }

  return getABExperimentModel().findUnique({
    where: { id: experimentId },
    include: { bucketConfigs: true },
  });
}

export async function resolveUserBucket(userId: string, experimentId: string): Promise<{
  bucketLabel: string;
  modelProvider: string;
  modelName: string;
  extraConfig: unknown;
}> {
  if (!userId) {
    throw new Error('userId is required');
  }

  const experiment = await getExperimentConfig(experimentId);
  if (!experiment) {
    throw new Error(`Experiment not found: ${experimentId}`);
  }
  if (!experiment.bucketConfigs.length) {
    throw new Error(`Experiment ${experimentId} has no bucket config`);
  }

  const bucketRanges = buildBucketRanges(experiment.bucketConfigs);
  const bucketLabel = assignBucket(userId, experiment.id, bucketRanges);
  const bucketConfig = experiment.bucketConfigs.find((config) => config.bucketLabel === bucketLabel);

  if (!bucketConfig) {
    throw new Error(`Bucket config not found for label ${bucketLabel}`);
  }

  return {
    bucketLabel,
    modelProvider: bucketConfig.modelProvider,
    modelName: bucketConfig.modelName,
    extraConfig: bucketConfig.extraConfig,
  };
}
