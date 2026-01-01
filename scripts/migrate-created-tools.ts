/**
 * Migration Script: CreatedTool → Material
 *
 * Migrates all CreatedTool records to the unified Material table.
 * Part of the Session Summary & Unified Archive feature.
 *
 * Usage: npx ts-node scripts/migrate-created-tools.ts
 *
 * NOTE: Does NOT delete CreatedTool records (30-day buffer).
 * Run cleanup script after buffer period.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

async function migrateCreatedTools(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  console.log('Starting CreatedTool → Material migration...\n');

  // Get all CreatedTool records
  const createdTools = await prisma.createdTool.findMany({
    orderBy: { createdAt: 'asc' },
  });

  stats.total = createdTools.length;
  console.log(`Found ${stats.total} CreatedTool records to migrate.\n`);

  if (stats.total === 0) {
    console.log('No records to migrate. Exiting.');
    return stats;
  }

  for (const tool of createdTools) {
    const toolId = `migrated-${tool.id}`;

    try {
      // Check if already migrated
      const existing = await prisma.material.findUnique({
        where: { toolId },
      });

      if (existing) {
        console.log(`  [SKIP] ${tool.id} - Already migrated`);
        stats.skipped++;
        continue;
      }

      // Create Material record
      await prisma.material.create({
        data: {
          userId: tool.userId,
          toolId,
          toolType: tool.type,
          title: tool.title,
          content: tool.content,
          maestroId: tool.maestroId,
          sessionId: tool.sessionId,
          topic: tool.topic,
          conversationId: tool.conversationId,
          userRating: tool.userRating,
          isBookmarked: tool.isBookmarked,
          viewCount: tool.viewCount,
          status: 'active',
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt,
        },
      });

      console.log(`  [OK] ${tool.id} → ${toolId} (${tool.type}: ${tool.title.substring(0, 30)}...)`);
      stats.migrated++;
    } catch (error) {
      console.error(`  [ERROR] ${tool.id}: ${error}`);
      stats.errors++;
    }
  }

  return stats;
}

async function main() {
  console.log('='.repeat(60));
  console.log('CreatedTool → Material Migration');
  console.log('='.repeat(60));
  console.log();

  try {
    const stats = await migrateCreatedTools();

    console.log();
    console.log('='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`  Total records:  ${stats.total}`);
    console.log(`  Migrated:       ${stats.migrated}`);
    console.log(`  Skipped:        ${stats.skipped}`);
    console.log(`  Errors:         ${stats.errors}`);
    console.log();

    if (stats.errors > 0) {
      console.log('⚠️  Some records failed to migrate. Check logs above.');
      process.exit(1);
    }

    if (stats.migrated > 0) {
      console.log('✅ Migration completed successfully!');
      console.log();
      console.log('Next steps:');
      console.log('  1. Verify data in Material table');
      console.log('  2. Update API routes to use Material');
      console.log('  3. Wait 30 days before removing CreatedTool table');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
