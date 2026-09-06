/**
 * Standalone tier seed entry point — `npm run seed:tiers`.
 *
 * This file used to contain its own full copy of the tier definitions, which
 * drifted badly from `src/lib/seeds/tier-seed.ts`: it seeded maestro IDs that
 * no longer exist ('leonardo-art' instead of 'leonardo'), a hand-maintained
 * roster that never grew when maestri were added, and it would have upgraded
 * Base users to the expensive realtime model. A database refreshed through
 * this script therefore contradicted one seeded through the shared module.
 *
 * It is now a thin wrapper. There is one definition of a tier, in one place;
 * this only supplies a PrismaClient and a process exit code.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPrismaClient } from '../src/lib/ssl-config';
import { seedTiers } from '../src/lib/seeds/tier-seed';

export async function runTierSeed() {
  try {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) throw new Error('DATABASE_URL is required for tier seeding');
    const prisma = createPrismaClient(databaseUrl);
    console.log('Seeding tier definitions (ADR 0073)...');
    let result: { definitions: Awaited<ReturnType<typeof seedTiers>> } | { error: unknown };
    try {
      result = { definitions: await seedTiers(prisma) };
    } catch (error) {
      result = { error };
    }
    try {
      await prisma.$disconnect();
    } catch (error) {
      if ('error' in result) {
        throw new AggregateError([result.error, error], 'Tier seeding and cleanup both failed');
      }
      throw error;
    }
    if ('error' in result) throw result.error;
    const { trial, base, pro } = result.definitions;

    // availableMaestri is a JSON column, so its type is not an array here.
    const count = (value: unknown) => (Array.isArray(value) ? value.length : '?');

    console.log('Tier seed completed:', {
      trial: trial.code,
      base: `${base.code} (${count(base.availableMaestri)} maestri)`,
      pro: `${pro.code} (${count(pro.availableMaestri)} maestri)`,
    });
  } catch (error) {
    console.error('Tier seed failed:', error);
    process.exitCode = 1;
  }
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const entryModule = createRequire(import.meta.url).resolve(resolve(entry));
    return import.meta.url === pathToFileURL(entryModule).href;
  } catch (error) {
    // An importing process can have a non-file argument after --eval.
    if (error instanceof Error && 'code' in error && error.code === 'MODULE_NOT_FOUND')
      return false;
    throw error;
  }
}

if (isDirectExecution()) {
  void runTierSeed();
}
