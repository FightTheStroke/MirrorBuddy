import { waitUntil } from '@vercel/functions';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { DEFAULT_FLAGS } from './default-flags';
import type { FeatureFlag, FeatureFlagStatus, FeatureFlagUpdate, KnownFeatureFlag } from './types';

const flagCache = new Map<string, FeatureFlag>();
const localUpdates = new Map<string, Partial<FeatureFlag>>();
let globalPolicy = { enabled: false, reason: undefined as string | undefined };
let localGlobalPolicy: typeof globalPolicy | undefined;
let databaseLoaded = false;
let loadFailureReported = false;
let policyLoad: Promise<void> | null = null;
let nextRefreshAt = Number.POSITIVE_INFINITY;
let resetGeneration = 0;

function refreshOnRead(): void {
  if (Date.now() >= nextRefreshAt && !policyLoad) waitUntil(reloadFlags());
}

function ensureFallbackDefaults(): void {
  if (flagCache.size > 0) return;
  const now = new Date();
  for (const [id, config] of Object.entries(DEFAULT_FLAGS)) {
    flagCache.set(id, { id, ...config, updatedAt: now });
  }
  logger.debug('Feature flags answered from compiled defaults (database policy not loaded)');
}

function effectiveFlag(flag: FeatureFlag): FeatureFlag {
  const update = localUpdates.get(flag.id);
  if (!update) return flag;
  return {
    ...flag,
    ...update,
    ...(update.metadata && { metadata: { ...flag.metadata, ...update.metadata } }),
  };
}

export function getFlag(featureId: KnownFeatureFlag): FeatureFlag | undefined {
  refreshOnRead();
  if (!databaseLoaded) ensureFallbackDefaults();
  const flag = flagCache.get(featureId);
  return flag && effectiveFlag(flag);
}

export function getAllFlags(): FeatureFlag[] {
  refreshOnRead();
  if (!databaseLoaded) ensureFallbackDefaults();
  return Array.from(flagCache.values(), effectiveFlag);
}

export function applyLocalUpdate(featureId: KnownFeatureFlag, update: FeatureFlagUpdate): void {
  const previous = localUpdates.get(featureId);
  localUpdates.set(featureId, {
    ...previous,
    ...(update.status !== undefined && { status: update.status }),
    ...(update.enabledPercentage !== undefined && {
      enabledPercentage: Math.min(100, Math.max(0, update.enabledPercentage)),
    }),
    ...(update.killSwitch !== undefined && { killSwitch: update.killSwitch }),
    ...(update.metadata && { metadata: { ...previous?.metadata, ...update.metadata } }),
    updatedAt: new Date(),
    updatedBy: update.updatedBy,
  });
}

export function applyLocalGlobalPolicy(enabled: boolean, reason?: string): void {
  localGlobalPolicy = { enabled, reason };
}

export function isGlobalKillSwitchActive(): boolean {
  refreshOnRead();
  return (localGlobalPolicy ?? globalPolicy).enabled;
}

export function getGlobalKillSwitchReason(): string | undefined {
  refreshOnRead();
  return (localGlobalPolicy ?? globalPolicy).reason;
}

export function isUsingFallbackDefaults(): boolean {
  return !databaseLoaded;
}

export async function initializeFlags(): Promise<void> {
  if (!databaseLoaded) await reloadFlags();
}

async function loadDatabasePolicy(generation: number): Promise<void> {
  try {
    const config = await prisma.globalConfig.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', killSwitch: false },
    });
    const dbFlags = await prisma.featureFlag.findMany();
    const dbFlagMap = new Map(dbFlags.map((flag) => [flag.id, flag]));
    const nextFlags = new Map<string, FeatureFlag>();
    for (const [id, defaults] of Object.entries(DEFAULT_FLAGS)) {
      const flag =
        dbFlagMap.get(id) ??
        (await prisma.featureFlag.upsert({
          where: { id },
          update: {},
          create: {
            id,
            name: defaults.name,
            description: defaults.description,
            status: defaults.status,
            enabledPercentage: defaults.enabledPercentage,
            killSwitch: defaults.killSwitch,
          },
        }));
      nextFlags.set(id, {
        id: flag.id,
        name: flag.name,
        description: flag.description,
        status: flag.status as FeatureFlagStatus,
        enabledPercentage: flag.enabledPercentage,
        killSwitch: flag.killSwitch,
        metadata: flag.metadata as Record<string, unknown> | undefined,
        updatedAt: flag.updatedAt,
        updatedBy: flag.updatedBy ?? undefined,
      });
    }
    if (generation !== resetGeneration) return;
    globalPolicy = { enabled: config.killSwitch, reason: config.killSwitchReason ?? undefined };
    flagCache.clear();
    nextFlags.forEach((flag, id) => flagCache.set(id, flag));
    databaseLoaded = true;
    loadFailureReported = false;
    nextRefreshAt = Number.POSITIVE_INFINITY;
    logger.info('Feature flags initialized from database', { count: flagCache.size });
  } catch (error) {
    if (generation !== resetGeneration) return;
    if (!loadFailureReported) {
      loadFailureReported = true;
      logger.error('Failed to load flags from DB; retaining current policy', undefined, error);
    }
    if (!databaseLoaded) ensureFallbackDefaults();
    nextRefreshAt = Date.now() + 5_000;
  }
}

export async function reloadFlags(): Promise<void> {
  if (!policyLoad) {
    const pending = loadDatabasePolicy(resetGeneration).finally(() => {
      if (policyLoad === pending) policyLoad = null;
    });
    policyLoad = pending;
  }
  await policyLoad;
}

export function _resetForTesting(): void {
  resetGeneration++;
  flagCache.clear();
  localUpdates.clear();
  globalPolicy = { enabled: false, reason: undefined };
  localGlobalPolicy = undefined;
  databaseLoaded = false;
  loadFailureReported = false;
  policyLoad = null;
  nextRefreshAt = Number.POSITIVE_INFINITY;
}
