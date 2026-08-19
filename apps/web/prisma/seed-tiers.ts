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
import { PrismaClient } from '@prisma/client';

import { seedTiers } from '../src/lib/seeds/tier-seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding tier definitions (ADR 0073)...');
  const { trial, base, pro } = await seedTiers(prisma);

  // availableMaestri is a JSON column, so its type is not an array here.
  const count = (v: unknown) => (Array.isArray(v) ? v.length : '?');

  console.log('Tier seed completed:', {
    trial: trial.code,
    base: `${base.code} (${count(base.availableMaestri)} maestri)`,
    pro: `${pro.code} (${count(pro.availableMaestri)} maestri)`,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
