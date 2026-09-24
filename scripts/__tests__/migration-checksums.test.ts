// @vitest-environment node
/**
 * The migration gate only asked "was each migration run?". It never asked
 * whether the file in the repository is still the one that ran: an edited
 * migration.sql deploys as "applied" while production holds the old schema.
 * Ported from the unmerged release-safe inventory work (13 Sep 2026).
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { findChecksumDrift } from '../lib/migration-checksums';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const applied = (name: string, checksum: string, extra: Record<string, unknown> = {}) => ({
  migration_name: name,
  checksum,
  finished_at: new Date('2026-09-01T00:00:00Z'),
  rolled_back_at: null,
  ...extra,
});

describe('findChecksumDrift', () => {
  it('accepts a migration whose file still matches what production ran', () => {
    const sql = 'CREATE TABLE "A" (id text);\n';
    expect(findChecksumDrift([{ name: 'm1', sql }], [applied('m1', sha(sql))])).toEqual([]);
  });

  it('reports a migration edited after it was applied', () => {
    expect(
      findChecksumDrift(
        [{ name: 'm1', sql: 'CREATE TABLE "A" (id text, extra int);\n' }],
        [applied('m1', sha('CREATE TABLE "A" (id text);\n'))],
      ),
    ).toEqual(['m1']);
  });

  it('matches Prisma, which hashes the file with line endings normalised to LF', () => {
    const lf = 'CREATE TABLE "A" (id text);\nSELECT 1;\n';
    const crlf = lf.replace(/\n/g, '\r\n');
    expect(findChecksumDrift([{ name: 'm1', sql: crlf }], [applied('m1', sha(lf))])).toEqual([]);
    const cr = lf.replace(/\n/g, '\r');
    expect(findChecksumDrift([{ name: 'm1', sql: cr }], [applied('m1', sha(lf))])).toEqual([]);
  });

  it('checks only finished, not rolled-back rows, and ignores migrations not yet applied', () => {
    const sql = 'SELECT 1;\n';
    expect(
      findChecksumDrift(
        [
          { name: 'm1', sql },
          { name: 'm2', sql },
        ],
        [
          applied('m1', sha('old'), { rolled_back_at: new Date() }),
          applied('m1', sha(sql)),
          applied('m3', sha('other')),
        ],
      ),
    ).toEqual([]);
  });

  it('treats malformed rows as unverifiable instead of silently passing them', () => {
    expect(
      findChecksumDrift([{ name: 'm1', sql: 'SELECT 1;\n' }], [applied('m1', '' as string)]),
    ).toEqual(['m1']);
    expect(findChecksumDrift(null as never, null as never)).toEqual([]);
  });
});
