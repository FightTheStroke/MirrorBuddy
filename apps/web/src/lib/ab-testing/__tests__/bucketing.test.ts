import { describe, expect, it } from 'vitest';

import { assignBucket, hashBucket } from '../bucketing';

const ranges = {
  control: [0, 49],
  treatment: [50, 99],
} as const;

function createRandomUserIds(count: number): string[] {
  let seed = 123456789;

  return Array.from({ length: count }, (_, index) => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return `user-${index}-${seed.toString(36)}`;
  });
}

describe('bucketing', () => {
  it('is deterministic for the same user and experiment', () => {
    const userId = 'user-123';
    const experiment = 'research-experiment';

    const first = hashBucket(userId, experiment);
    const second = hashBucket(userId, experiment);
    const assignedFirst = assignBucket(userId, experiment, ranges);
    const assignedSecond = assignBucket(userId, experiment, ranges);

    expect(first).toBe(second);
    expect(assignedFirst).toBe(assignedSecond);
  });

  it('distributes around an even split across 1000 random users', () => {
    const users = createRandomUserIds(1000);
    let control = 0;
    let treatment = 0;

    for (const userId of users) {
      const bucket = assignBucket(userId, 'distribution-test', ranges);
      if (bucket === 'control') control++;
      if (bucket === 'treatment') treatment++;
    }

    expect(control + treatment).toBe(1000);
    expect(control).toBeGreaterThanOrEqual(400);
    expect(control).toBeLessThanOrEqual(600);
    expect(treatment).toBeGreaterThanOrEqual(400);
    expect(treatment).toBeLessThanOrEqual(600);
  });

  it('handles edge-case identifiers like empty and special characters', () => {
    const edgeCases: Array<[string, string]> = [
      ['', ''],
      ['', 'experiment'],
      ['user-ç-ß-🚀', 'exp-!@#$%^&*()_+|~`{}[]:";\'<>?,./'],
    ];

    for (const [userId, experimentName] of edgeCases) {
      const bucket = hashBucket(userId, experimentName);
      const assigned = assignBucket(userId, experimentName, ranges);

      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThanOrEqual(99);
      expect(['control', 'treatment']).toContain(assigned);
    }
  });
});
