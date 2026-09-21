// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { countQuery, probes } from '../count-migration-orphans';

const migration = readFileSync(
  join(
    import.meta.dirname,
    '..',
    '..',
    'apps',
    'web',
    'prisma',
    'migrations',
    '20260921070000_add_missing_foreign_keys',
    'migration.sql',
  ),
  'utf-8',
);

describe('cleanup migration orphan probes', () => {
  it('reads every cleanup statement out of the migration that will actually run', () => {
    const found = probes(migration);
    const deletes = found.filter((p) => p.effect === 'delete');
    const detaches = found.filter((p) => p.effect === 'detach');

    expect(deletes.map((p) => p.table)).toContain('"Material"');
    expect(detaches.map((p) => p.table)).toEqual(['"compliance_audit_entries"']);
    expect(found).toHaveLength(deletes.length + detaches.length);
    expect(deletes.length).toBeGreaterThan(15);
  });

  it('keeps the migration predicate intact so the count answers the same question', () => {
    const material = probes(migration).find((p) => p.table === '"Material"');
    expect(material).toBeDefined();
    expect(countQuery(material!)).toBe(
      'SELECT count(*)::int AS n FROM "Material" WHERE NOT EXISTS (SELECT 1 FROM "User" p WHERE p."id" = "Material"."userId")',
    );
  });

  it('never produces a statement that writes', () => {
    for (const probe of probes(migration)) {
      expect(countQuery(probe)).toMatch(/^SELECT count\(\*\)/);
      expect(countQuery(probe)).not.toMatch(/\b(DELETE|UPDATE|ALTER|DROP|INSERT)\b/i);
    }
  });

  it('reports nothing to clean for an additive migration', () => {
    expect(probes('ALTER TABLE "Material" ADD COLUMN "x" INTEGER;')).toEqual([]);
  });
});
