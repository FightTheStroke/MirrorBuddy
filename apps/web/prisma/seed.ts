/**
 * Prisma Database Seeding
 *
 * Main seeding entry point that orchestrates all seed functions.
 * Run with: npx prisma db seed
 * Plan 073: T1-04 - Create seed data: Trial, Base, Pro defaults
 * Plan 074: Uses shared SSL configuration from src/lib/ssl-config.ts
 */

import { createPrismaClient } from '../src/lib/ssl-config';
import { seedTiers } from '../src/lib/seeds/tier-seed';
import { seedLocaleConfigs } from '../src/lib/seeds/locale-config-seed';

async function main() {
  const prisma = createPrismaClient();

  try {
    console.log('🌱 Starting database seeding...\n');

    // Seed tiers
    console.log('📚 Seeding tier definitions...');
    const { trial, base, pro } = await seedTiers(prisma);
    console.log('✅ Tiers seeded:', {
      trial: trial.code,
      base: base.code,
      pro: pro.code,
    });

    // Seed locale configurations
    console.log('🌍 Seeding locale configurations...');
    const locales = await seedLocaleConfigs(prisma);
    console.log(
      '✅ Locales seeded:',
      locales.map((l) => l.id),
    );

    console.log('\n✨ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
