#!/usr/bin/env npx ts-node
/**
 * SQLite to PostgreSQL Migration Script
 *
 * Usage:
 *   1. Ensure DATABASE_URL points to PostgreSQL
 *   2. Run: npx ts-node scripts/migrate-sqlite-to-postgres.ts
 *
 * Prerequisites:
 *   - SQLite database at prisma/dev.db
 *   - PostgreSQL with schema already created (npx prisma migrate deploy)
 *   - better-sqlite3 installed: npm install -D better-sqlite3 @types/better-sqlite3
 */

import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

const SQLITE_PATH = path.join(__dirname, '..', 'prisma', 'dev.db');

// Tables in order that respects foreign key constraints
const TABLES = [
  'User',
  'Profile',
  'Settings',
  'Progress',
  'AccessibilitySettings',
  'OnboardingState',
  'PomodoroStats',
  'UserGamification',
  'StudySession',
  'Conversation',
  'Message',
  'Material',
  'FlashcardDeck',
  'Flashcard',
  'FlashcardProgress',
  'QuizResult',
  'Learning',
  'CalendarEvent',
  'HtmlSnippet',
  'HomeworkSession',
  'HomeworkStep',
  'PushSubscription',
  'ContentEmbedding',
  'AuditLog',
];

interface MigrationStats {
  table: string;
  sourceCount: number;
  migratedCount: number;
  skippedCount: number;
  errors: string[];
}

async function migrateTable(
  sqlite: Database.Database,
  prisma: PrismaClient,
  tableName: string
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    table: tableName,
    sourceCount: 0,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  try {
    // Check if table exists in SQLite
    const tableExists = sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);

    if (!tableExists) {
      console.log(`  ⏭️  Table ${tableName} not found in SQLite, skipping`);
      return stats;
    }

    // Get all records from SQLite
    const records = sqlite.prepare(`SELECT * FROM "${tableName}"`).all() as Record<string, unknown>[];
    stats.sourceCount = records.length;

    if (records.length === 0) {
      console.log(`  ⏭️  Table ${tableName} is empty, skipping`);
      return stats;
    }

    console.log(`  📦 Migrating ${records.length} records from ${tableName}...`);

    // Get the Prisma model name (camelCase)
    const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);

    // @ts-expect-error - Dynamic model access
    const model = prisma[modelName];
    if (!model) {
      stats.errors.push(`Model ${modelName} not found in Prisma client`);
      return stats;
    }

    // Process records in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      for (const record of batch) {
        try {
          // Transform record for PostgreSQL
          const transformed = transformRecord(tableName, record);

          // Upsert to handle existing records
          await model.upsert({
            where: { id: transformed.id },
            create: transformed,
            update: transformed,
          });

          stats.migratedCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          // Skip duplicate key errors silently
          if (errorMsg.includes('Unique constraint')) {
            stats.skippedCount++;
          } else {
            stats.errors.push(`Record ${record.id}: ${errorMsg}`);
          }
        }
      }

      // Progress indicator
      const progress = Math.min(i + BATCH_SIZE, records.length);
      process.stdout.write(`\r  📦 Progress: ${progress}/${records.length}`);
    }

    console.log(); // New line after progress
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stats.errors.push(`Table error: ${errorMsg}`);
  }

  return stats;
}

function transformRecord(
  tableName: string,
  record: Record<string, unknown>
): Record<string, unknown> {
  const transformed = { ...record };

  // Convert SQLite datetime strings to Date objects
  for (const [key, value] of Object.entries(transformed)) {
    if (typeof value === 'string') {
      // Check if it looks like a datetime
      if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(value)) {
        transformed[key] = new Date(value);
      }
    }
    // Handle SQLite NULL stored as string "null"
    if (value === 'null') {
      transformed[key] = null;
    }
    // Handle SQLite boolean stored as 0/1
    if (typeof value === 'number' && (value === 0 || value === 1)) {
      // Only convert known boolean fields
      const booleanFields = [
        'highContrast', 'dyslexiaFont', 'reducedMotion', 'voiceEnabled',
        'soundEffects', 'notificationsEnabled', 'pomodoroAutoStart',
        'voiceBargeInEnabled', 'isRetired', 'isSystem', 'completed',
        'hasSeenWelcome', 'hasCompletedOnboarding', 'isActive',
      ];
      if (booleanFields.includes(key)) {
        transformed[key] = value === 1;
      }
    }
  }

  // Table-specific transformations
  switch (tableName) {
    case 'ContentEmbedding':
      // Keep vector as JSON string for now
      // The pgvector migration script will convert to native vector
      break;
  }

  return transformed;
}

async function main() {
  console.log('🚀 SQLite to PostgreSQL Migration\n');
  console.log(`   SQLite: ${SQLITE_PATH}`);
  console.log(`   PostgreSQL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}\n`);

  // Verify SQLite file exists
  const fs = await import('fs');
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`❌ SQLite database not found at ${SQLITE_PATH}`);
    process.exit(1);
  }

  // Connect to SQLite
  console.log('📂 Opening SQLite database...');
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  // Connect to PostgreSQL
  console.log('🐘 Connecting to PostgreSQL...');
  const prisma = new PrismaClient();

  try {
    // Test PostgreSQL connection
    await prisma.$connect();
    console.log('✅ PostgreSQL connected\n');

    // Migrate tables
    const allStats: MigrationStats[] = [];

    for (const table of TABLES) {
      console.log(`\n📋 Table: ${table}`);
      const stats = await migrateTable(sqlite, prisma, table);
      allStats.push(stats);

      if (stats.migratedCount > 0) {
        console.log(`  ✅ Migrated: ${stats.migratedCount}`);
      }
      if (stats.skippedCount > 0) {
        console.log(`  ⏭️  Skipped (duplicates): ${stats.skippedCount}`);
      }
      if (stats.errors.length > 0) {
        console.log(`  ⚠️  Errors: ${stats.errors.length}`);
        stats.errors.slice(0, 3).forEach(e => console.log(`     - ${e}`));
        if (stats.errors.length > 3) {
          console.log(`     ... and ${stats.errors.length - 3} more`);
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary\n');

    let totalSource = 0;
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const stats of allStats) {
      if (stats.sourceCount > 0) {
        totalSource += stats.sourceCount;
        totalMigrated += stats.migratedCount;
        totalSkipped += stats.skippedCount;
        totalErrors += stats.errors.length;
      }
    }

    console.log(`   Total records in SQLite: ${totalSource}`);
    console.log(`   Successfully migrated:   ${totalMigrated}`);
    console.log(`   Skipped (duplicates):    ${totalSkipped}`);
    console.log(`   Errors:                  ${totalErrors}`);

    if (totalErrors === 0 && totalMigrated === totalSource - totalSkipped) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('  1. Verify data: SELECT COUNT(*) FROM "User";');
      console.log('  2. Run prisma migrate: npx prisma migrate deploy');
    } else {
      console.log('\n⚠️  Migration completed with some issues');
    }
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
