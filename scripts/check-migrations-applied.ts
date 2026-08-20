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
import { probeVectorSearchFunction } from './lib/vector-search-probe';
import { createPgClient } from './lib/pg-connection';

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

  const client = createPgClient(url);

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

    // A migration row says a file was run, not that its body took effect.
    // Production listed 20260117183800_pgvector as applied since 20 Jan 2026
    // while search_similar_embeddings did not exist, so this script would have
    // printed "schema matches" over a database that could not run a single
    // vector search (finding G-12). The check below calls the function.
    const probe = await probeVectorSearchFunction(async (sql, params) => {
      const { rows } = await client.query(sql, params as unknown[]);
      return rows;
    });

    if (probe.status === 'missing') {
      console.error(
        '\n✗ search_similar_embeddings is missing or has a stale signature, even though its migration is recorded as applied.',
      );
      console.error('    Every vector search will degrade to an unordered in-memory scan.');
      console.error(
        '    Re-apply apps/web/prisma/migrations/20260820120000_vector_search_source_id/migration.sql against this database.',
      );
      process.exit(1);
    }

    if (probe.status === 'error') {
      console.error(`\n✗ Could not verify search_similar_embeddings: ${probe.message}`);
      process.exit(1);
    }

    console.log('✓ Database schema matches the migrations in the repo.');
    console.log('✓ search_similar_embeddings is callable with the source id argument.');
  } catch (error) {
    console.error('✗ Could not verify migrations:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

void main();
