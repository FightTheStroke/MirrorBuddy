// @vitest-environment node
/**
 * ADR 0182: seeds never rerun in production, so the single-model rollout reaches
 * existing TierDefinition rows only through this data migration. Every per-feature
 * model column the tier service reads must be moved, or that feature silently keeps
 * its old model on live tiers.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const prismaDir = join(__dirname, '../../../../prisma');
const schema = readFileSync(join(prismaDir, 'schema/tier.prisma'), 'utf8');
const migration = readFileSync(
  join(prismaDir, 'migrations/20260930090000_tiers_gpt61_sol/migration.sql'),
  'utf8',
);

const tierBlock = schema.slice(schema.indexOf('model TierDefinition'));
const featureModelColumns = [
  ...tierBlock.slice(0, tierBlock.indexOf('\n}')).matchAll(/^\s+(\w+Model)\s+String/gm),
]
  .map((m) => m[1])
  .filter((c) => c !== 'demoModel' && c !== 'realtimeModel');

describe('tiers → gpt-6.1-sol data migration', () => {
  it('finds the per-feature model columns in the schema', () => {
    expect(featureModelColumns).toContain('chatModel');
    expect(featureModelColumns).toContain('webcamModel');
  });

  it.each(featureModelColumns)('moves %s to gpt-6.1-sol', (column) => {
    expect(migration).toMatch(new RegExp(`"${column}"\\s*=\\s*'gpt-6\\.1-sol'`));
  });

  it('touches exactly the three public tiers and leaves the demo model alone', () => {
    expect(migration).toMatch(/"code"\s+IN\s+\('trial',\s*'base',\s*'pro'\)/);
    expect(migration).not.toMatch(/"demoModel"/);
  });
});
