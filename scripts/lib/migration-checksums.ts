/**
 * Detect migrations edited after production ran them.
 *
 * `_prisma_migrations.checksum` is the SHA-256 Prisma recorded when it applied
 * a migration (line endings normalised to LF since Prisma 2.29). If the file in
 * the repository no longer hashes to it, `migrate deploy` still reports the
 * migration as applied while production holds the schema of the old file.
 * `migrate deploy` does not compare checksums; only `migrate dev` does.
 */
import { createHash } from 'node:crypto';

export interface LocalMigration {
  name: string;
  sql: string;
}

export interface AppliedMigrationRow {
  migration_name: string;
  checksum: string | null;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Names of applied migrations whose repository file no longer matches the recorded checksum. */
export function findChecksumDrift(
  local: readonly LocalMigration[] | null | undefined,
  rows: readonly AppliedMigrationRow[] | null | undefined,
): string[] {
  const recorded = new Map<string, Set<string>>();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row?.migration_name || !row.finished_at || row.rolled_back_at) continue;
    const checksums = recorded.get(row.migration_name) ?? new Set<string>();
    if (typeof row.checksum === 'string') checksums.add(row.checksum.toLowerCase());
    recorded.set(row.migration_name, checksums);
  }
  const drifted: string[] = [];
  for (const migration of Array.isArray(local) ? local : []) {
    const checksums = recorded.get(migration?.name);
    if (!checksums || typeof migration.sql !== 'string') continue;
    const candidates = [sha256(migration.sql), sha256(migration.sql.replace(/\r\n?/g, '\n'))];
    if (!candidates.some((candidate) => checksums.has(candidate))) drifted.push(migration.name);
  }
  return drifted.sort();
}
