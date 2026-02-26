import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('BenchmarkTrend Prisma model schema', () => {
  it('defines BenchmarkTrend with required fields and index', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma/schema/research.prisma'), 'utf8');

    expect(schema).toContain('model BenchmarkTrend {');
    expect(schema).toContain('id           String');
    expect(schema).toContain('maestroId    String');
    expect(schema).toContain('profileId    String');
    expect(schema).toContain('dimension    String');
    expect(schema).toContain('score        Float');
    expect(schema).toContain('runDate      DateTime');
    expect(schema).toContain('experimentId String');
    expect(schema).toContain('@@index([maestroId, dimension, runDate])');
  });
});
