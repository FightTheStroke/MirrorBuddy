import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('A/B testing Prisma schema', () => {
  it('defines ABExperiment and ABBucketConfig with required fields', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma/schema/ab-testing.prisma'), 'utf8');

    expect(schema).toContain('model ABExperiment {');
    expect(schema).toContain('model ABBucketConfig {');
    expect(schema).toContain('modelProvider');
  });
});
