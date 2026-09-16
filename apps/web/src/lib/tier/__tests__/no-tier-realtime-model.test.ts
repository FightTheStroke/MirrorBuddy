import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Voice deployment is global, not per tier (issue #846)', () => {
  it.each([
    '../tier-helpers.ts',
    '../tier-service.ts',
    '../types.ts',
    '../tier-transformer.ts',
    '../tier-fallbacks.ts',
    '../../seeds/tier-seed.ts',
    '../../../app/admin/tiers/components/models-section.tsx',
    '../../../app/admin/tiers/components/tier-form.tsx',
    '../../../app/admin/tiers/[id]/edit/page.tsx',
    '../../../app/api/admin/tiers/[id]/route.ts',
  ])('%s does not expose, read or write a per-tier voice model', (path) => {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');

    expect(source).not.toMatch(/\brealtimeModel\b/);
  });
});
