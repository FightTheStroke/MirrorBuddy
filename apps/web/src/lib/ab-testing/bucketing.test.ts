import { describe, expect, it } from 'vitest';

import { assignBucket, hashBucket } from './bucketing';

describe('hashBucket', () => {
  it('returns a deterministic bucket between 0 and 99', () => {
    const first = hashBucket('user-123', 'experiment-a');
    const second = hashBucket('user-123', 'experiment-a');

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(99);
  });

  it('changes bucket when experiment changes', () => {
    const a = hashBucket('user-123', 'experiment-a');
    const b = hashBucket('user-123', 'experiment-b');

    expect(a).not.toBe(b);
  });
});

describe('assignBucket', () => {
  const ranges = {
    control: [0, 49],
    treatment: [50, 99],
  } as const;

  it('returns the expected label for the computed bucket', () => {
    const label = assignBucket('user-123', 'experiment-a', ranges);
    expect(['control', 'treatment']).toContain(label);
  });

  it('throws when no bucket range matches', () => {
    expect(() =>
      assignBucket('user-123', 'experiment-a', {
        impossible: [100, 120],
      }),
    ).toThrow('No matching bucket range');
  });
});
