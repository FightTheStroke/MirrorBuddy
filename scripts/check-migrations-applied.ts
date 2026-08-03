#!/usr/bin/env tsx
/**
 * Fails when the database is missing migrations that exist in the repo.
 *
 * Why this exists: the "generate pairing code" button returned a 500 for weeks
 * because the RobotDevice table had never been created in production. The code
 * shipped, the migration did not, and nothing anywhere said so — the only signal
 * was a parent clicking a button that did nothing. A schema this far behind the
 * code is silent until a child hits it.
 *
 * Run against production with:
 *   DIRECT_URL=... npx tsx scripts/check-migrations-applied.ts
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const MIGRATIONS_DIR = join(process.cwd(), 'apps/web/prisma/migrations');

function localMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

async function appliedMigrations(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{
    migration_name: string;
    finished_at: Date | null;
    rolled_back_at: Date | null;
  }>('SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations');
  return new Set(
    rows.filter((r) => r.finished_at && !r.rolled_back_at).map((r) => r.migration_name),
  );
}

async function main(): Promise<void> {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('✗ Neither DIRECT_URL nor DATABASE_URL is set.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url.replace(/[?&]sslmode=[^&]*/, ''),
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const local = localMigrations();
    const applied = await appliedMigrations(client);
    const pending = local.filter((m) => !applied.has(m));

    console.log(
      `Migrations — in repo: ${local.length}, applied: ${applied.size}, pending: ${pending.length}`,
    );

    if (pending.length > 0) {
      console.error('\n✗ The database is behind the code. Not applied:');
      pending.forEach((m) => console.error(`    ${m}`));
      console.error('\nRun `npx prisma migrate deploy` against this database before shipping.');
      process.exit(1);
    }

    console.log('✓ Database schema matches the migrations in the repo.');
  } catch (error) {
    console.error('✗ Could not verify migrations:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

void main();
