#!/usr/bin/env tsx
/**
 * Reports how many rows a cleanup migration would remove or detach, without
 * touching them.
 *
 * `20260921070000_add_missing_foreign_keys` installs the foreign keys the Prisma
 * schema always declared but SQL never had, and it must first clear the rows that
 * can no longer reach a parent. Those deletes are irreversible in production and
 * nothing in the pipeline says how many rows they cover, so the decision to run
 * the migration was being made blind.
 *
 * This runs the same predicates as `SELECT count(*)` and prints one line per
 * statement. It issues no DELETE, no UPDATE and no DDL. Like the repair guard it
 * prints nothing that identifies the host, the user or the credentials: this runs
 * in a public repository's logs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPgClient } from './lib/pg-connection';

export type Probe = { table: string; effect: 'delete' | 'detach'; predicate: string };

const DELETE = /DELETE\s+FROM\s+("[^"]+")\s+WHERE\s+([\s\S]*?);/gi;
const UPDATE = /UPDATE\s+("[^"]+")\s+SET\s+[\s\S]*?\s+WHERE\s+([\s\S]*?);/gi;

/**
 * The migration's own statements are the only trustworthy description of what it
 * will touch: a hand-written copy of each predicate would drift from the SQL that
 * actually runs and would report reassuring numbers for a different question.
 */
export function probes(sql: string): Probe[] {
  const found: Probe[] = [];
  for (const [, table, predicate] of sql.matchAll(DELETE)) {
    found.push({ table, effect: 'delete', predicate: predicate.trim() });
  }
  for (const [, table, predicate] of sql.matchAll(UPDATE)) {
    found.push({ table, effect: 'detach', predicate: predicate.trim() });
  }
  return found;
}

export function countQuery(probe: Probe): string {
  return `SELECT count(*)::int AS n FROM ${probe.table} WHERE ${probe.predicate}`;
}

async function main(): Promise<void> {
  const migration = process.env.MIGRATION;
  if (!migration) throw new Error('MIGRATION is required');
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error('DIRECT_URL or DATABASE_URL is required');

  const sql = readFileSync(
    join('apps', 'web', 'prisma', 'migrations', migration, 'migration.sql'),
    'utf-8',
  );
  const found = probes(sql);
  if (found.length === 0) {
    console.log(`${migration}: no cleanup statements — this migration removes nothing`);
    return;
  }

  const client = createPgClient(url);
  await client.connect();
  let deletes = 0;
  let detaches = 0;
  try {
    // A read-only transaction makes the guarantee the reviewer needs enforceable
    // by Postgres rather than by reading this file carefully.
    await client.query('BEGIN READ ONLY');
    for (const probe of found) {
      const result = await client.query<{ n: number }>(countQuery(probe));
      const n = result.rows[0]?.n ?? 0;
      if (probe.effect === 'delete') deletes += n;
      else detaches += n;
      console.log(`${probe.effect.padEnd(6)} ${String(n).padStart(8)}  ${probe.table}`);
    }
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }

  console.log(`\n${migration}`);
  console.log(`  rows that would be deleted: ${deletes}`);
  console.log(`  rows that would be detached (userId set to NULL): ${detaches}`);
  console.log('  nothing was written: every count ran inside a READ ONLY transaction');
}

if (process.argv[1]?.endsWith('count-migration-orphans.ts')) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
