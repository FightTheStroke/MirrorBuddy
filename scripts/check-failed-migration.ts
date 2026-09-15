#!/usr/bin/env tsx
/**
 * Guards the manual migration repair against the mistake that matters.
 *
 * `prisma migrate resolve --applied` on a migration that was never attempted does
 * not fail: it records the migration as done without ever running its SQL, and
 * `migrate deploy` then reports the database as up to date forever. A repair aimed
 * at the wrong name is therefore silent and permanent. This refuses to let the
 * repair proceed unless the named migration is really in the failed state.
 *
 * It also fingerprints the database it reached, so an operator can see the repair
 * is pointed at the intended one. Nothing it prints identifies the host, the user
 * or the credentials: this runs in a public repository's logs.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createPgClient } from './lib/pg-connection';

type State = 'failed' | 'applied';
type Expectation = State | 'report';

const EXPECTATIONS: readonly Expectation[] = ['failed', 'applied', 'report'];

type Row = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
  applied_steps_count: number | null;
};

/**
 * `resolve --applied` does not update the failed row: the schema engine marks every
 * unfinished row rolled back and INSERTs a new applied one, so a repaired migration
 * has two rows. Reading one arbitrary row would report a correct repair as failed.
 */
export function classify(rows: readonly Row[]): State | 'absent' | 'rolled-back' {
  if (rows.length === 0) return 'absent';
  if (rows.some((row) => row.finished_at && !row.rolled_back_at)) return 'applied';
  if (rows.some((row) => !row.finished_at && !row.rolled_back_at)) return 'failed';
  return 'rolled-back';
}

// pg surfaces the host, port and user inside connection errors.
export function safeReason(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  return typeof code === 'string' && /^[A-Z0-9]+$/.test(code)
    ? `database error ${code}`
    : 'could not reach or query the database';
}

function migrationExists(name: string): boolean {
  return readdirSync(join(process.cwd(), 'apps/web/prisma/migrations'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .some((entry) => entry.name === name);
}

async function main(): Promise<void> {
  const [name, expected] = process.argv.slice(2) as [string?, Expectation?];
  if (!name || !expected || !EXPECTATIONS.includes(expected)) {
    console.error('Usage: check-failed-migration.ts <migration-name> failed|applied|report');
    process.exit(1);
  }
  if (!migrationExists(name)) {
    console.error(`No such migration in this source: ${name}`);
    process.exit(1);
  }
  // prisma.config.ts gives DIRECT_URL precedence, and Supabase migrations must
  // not go through the pooled port. Read the same one the repair will write to.
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('Neither DIRECT_URL nor DATABASE_URL is set');
    process.exit(1);
  }
  const client = createPgClient(url);
  try {
    await client.connect();
    const database = (await client.query<{ current_database: string }>('SELECT current_database()'))
      .rows[0]?.current_database;
    const { rows } = await client.query<Row>(
      'SELECT migration_name, finished_at, rolled_back_at, applied_steps_count FROM _prisma_migrations WHERE migration_name = $1 ORDER BY started_at',
      [name],
    );
    const total = (
      await client.query<{ count: string }>('SELECT count(*)::text FROM _prisma_migrations')
    ).rows[0]?.count;
    const state = classify(rows);
    console.log(`Database: ${database} — ${total} recorded migrations`);
    console.log(`Migration ${name}: ${state} (${rows.length} row(s))`);
    if (expected === 'report') return;
    if (state !== expected) {
      console.error(`Refusing to continue: expected this migration to be ${expected}.`);
      if (state === 'absent') {
        console.error('It was never attempted here. Marking it applied would skip its SQL.');
      }
      process.exit(1);
    }
    if (state === 'failed') {
      console.log('Note: a migration still running looks identical to a failed one.');
    }
    console.log(`Confirmed ${expected}.`);
  } catch (error) {
    console.error(`Verification failed: ${safeReason(error)}`);
    process.exit(1);
  } finally {
    await client.end().catch(() => undefined);
  }
}

const invokedDirectly =
  process.argv[1]?.endsWith('check-failed-migration.ts') === true &&
  !process.argv[1].endsWith('.test.ts');

if (invokedDirectly) void main();
