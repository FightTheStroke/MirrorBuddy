/**
 * Database targeting and verification for the Maestri knowledge base seeder.
 *
 * `.env` in this repository points at production Supabase, and
 * `packages/db/src/client.ts` silently rewrites a Supabase URL to local
 * PostgreSQL unless `NODE_ENV=production`. Either fact alone can make a seed
 * run write somewhere other than the operator intended, so the target is
 * resolved the same way the client resolves it, checked before any write, and
 * confirmed again against the live connection.
 */

import { isSupabaseUrl } from '@mirrorbuddy/utils';
import { prisma } from '../../../apps/web/src/lib/db';

export const SOURCE_TYPE = 'maestro_knowledge' as const;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    throw new Error(`DATABASE_URL is not a valid URL: ${url.slice(0, 24)}...`);
  }
}

/**
 * Mirror of the precedence in `packages/db/src/client.ts`. Kept deliberately
 * narrow: the seeder never runs under E2E, so only the development
 * Supabase-to-local rewrite matters here.
 */
function resolveEffectiveUrl(declared: string): string {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  if (!isProduction && isSupabaseUrl(declared)) {
    return process.env.DEV_DATABASE_URL || 'postgresql://localhost:5432/mirrorbuddy';
  }
  return declared;
}

export interface DatabaseTarget {
  host: string;
  isLocal: boolean;
}

/**
 * Decide, and report, which database this run will actually write to.
 * Exits rather than guessing: a seed run that silently targets the wrong
 * database is worse than one that refuses to start.
 */
export function resolveTarget(allowRemote: boolean): DatabaseTarget {
  const declared = process.env.DATABASE_URL;
  if (!declared) {
    console.error(
      '❌ DATABASE_URL is not set. Load your environment first, e.g.\n' +
        '   npm run kb:seed              (reads .env if present)\n' +
        '   DATABASE_URL=... npm run kb:seed',
    );
    process.exit(1);
  }

  const declaredHost = hostOf(declared);
  const effective = resolveEffectiveUrl(declared);
  const effectiveHost = hostOf(effective);
  const isLocal = LOCAL_HOSTS.has(effectiveHost);

  console.log(`Declared DATABASE_URL host:  ${declaredHost}`);
  console.log(`Effective target host:       ${effectiveHost}${isLocal ? ' (local)' : ' (REMOTE)'}`);

  if (declaredHost !== effectiveHost) {
    console.warn(
      `⚠️  The client rewrites ${declaredHost} to ${effectiveHost} outside production.\n` +
        `   Set NODE_ENV=production to write to the declared host.`,
    );
  }

  // The operator asked for a remote write but the client would redirect it
  // locally. Seeding local data while believing production was seeded is the
  // exact failure this check exists to prevent.
  if (allowRemote && isLocal && declaredHost !== effectiveHost) {
    console.error(
      `❌ --yes was passed and DATABASE_URL points at ${declaredHost}, but this run ` +
        `would write to ${effectiveHost}.\n` +
        `   Re-run with NODE_ENV=production to actually target ${declaredHost}.`,
    );
    process.exit(1);
  }

  if (!isLocal && !allowRemote) {
    console.error(
      `❌ Refusing to seed remote database "${effectiveHost}" without --yes.\n` +
        `   Re-run with --yes if you really mean to write there.`,
    );
    process.exit(1);
  }

  return { host: effectiveHost, isLocal };
}

/**
 * Confirm the open connection is the one `resolveTarget` approved, before any
 * write. Guards against anything the URL-level reasoning above cannot see.
 */
export async function assertConnectionMatches(target: DatabaseTarget): Promise<void> {
  let rows: Array<{ db: string; host: string | null }>;
  try {
    rows = await prisma.$queryRaw<Array<{ db: string; host: string | null }>>`
      SELECT current_database()::TEXT AS db, inet_server_addr()::TEXT AS host
    `;
  } catch (err) {
    console.error(
      `❌ Could not connect to the target database (${target.host}).\n` +
        `   ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`,
    );
    process.exit(1);
  }

  const db = rows[0]?.db ?? 'unknown';
  const host = rows[0]?.host ?? 'local socket';
  console.log(`Connected to:                db=${db} host=${host}`);

  const connectedLocally = host === 'local socket' || LOCAL_HOSTS.has(host) || host === '::1/128';
  if (target.isLocal !== connectedLocally) {
    console.error(
      `❌ Connection mismatch: expected a ${target.isLocal ? 'local' : 'remote'} database, ` +
        `but the open connection is ${connectedLocally ? 'local' : 'remote'} (${host}).`,
    );
    process.exit(1);
  }
}

/**
 * `ContentEmbedding.userId` is a foreign key to `User.id`, so the system corpus
 * needs an owner row to exist at all. This is why a seed run could never have
 * worked before: every insert failed the constraint.
 *
 * The row is created disabled so it can never be used to authenticate, and it
 * is not a data subject — it owns in-house didactic content, not personal data.
 * Note the FK cascades on delete: removing this row wipes the knowledge base.
 */
export async function ensureSystemUser(systemUserId: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: systemUserId } });
  if (existing) {
    if (!existing.disabled) {
      console.warn(`⚠️  System user ${systemUserId} exists but is not disabled.`);
    }
    return;
  }

  await prisma.user.create({
    data: { id: systemUserId, username: 'system-maestro-kb', role: 'USER', disabled: true },
  });
  console.log(`Created system owner row ${systemUserId} (disabled, non-login).`);
}

/**
 * Remove rows stored under a `sourceId` that is not a registered maestro.
 *
 * The retriever can never return them, so they are dead weight — and they are
 * the exact fingerprint of a knowledge file seeded under its file slug instead
 * of its runtime ID. Pruning keeps a re-seed self-healing rather than leaving
 * an invisible corpus behind.
 */
export async function pruneOrphans(systemUserId: string, validIds: string[]): Promise<number> {
  const { count } = await prisma.contentEmbedding.deleteMany({
    where: {
      userId: systemUserId,
      sourceType: SOURCE_TYPE,
      sourceId: { notIn: validIds },
    },
  });
  if (count > 0) {
    console.log(`Pruned ${count} rows stored under an unregistered maestro ID.`);
  }
  return count;
}

/**
 * Fail the run on an outcome that would otherwise look like success: no rows,
 * or rows the SQL search function cannot see because `vectorNative` is NULL.
 */
export async function verify(systemUserId: string): Promise<boolean> {
  const where = { userId: systemUserId, sourceType: SOURCE_TYPE };
  const total = await prisma.contentEmbedding.count({ where });

  const missingNative = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::BIGINT AS count
    FROM "ContentEmbedding"
    WHERE "userId" = ${systemUserId}
      AND "sourceType" = ${SOURCE_TYPE}
      AND "vectorNative" IS NULL
  `;
  const nullNative = Number(missingNative[0]?.count ?? 0);
  const maestri = await prisma.contentEmbedding.groupBy({ by: ['sourceId'], where });

  console.log('\nVerification');
  console.log(`  rows:              ${total}`);
  console.log(`  maestri covered:   ${maestri.length}`);
  console.log(`  vectorNative NULL: ${nullNative}`);

  if (total === 0) {
    console.error('❌ Seeding produced no rows — the knowledge base is still empty.');
    return false;
  }
  if (nullNative > 0) {
    console.error(
      `❌ ${nullNative} rows have no native vector; the SQL search function skips those rows.`,
    );
    return false;
  }

  console.log('✅ Knowledge base is populated and searchable.');
  return true;
}
