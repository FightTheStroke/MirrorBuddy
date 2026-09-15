// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { classify, safeReason } from '../check-failed-migration';

describe('classify', () => {
  it('treats a missing row as never attempted', () => {
    expect(classify(undefined)).toBe('absent');
  });

  it('treats a row without finished_at as the failed state Prisma blocks on', () => {
    expect(
      classify({
        migration_name: 'm',
        finished_at: null,
        rolled_back_at: null,
        applied_steps_count: 0,
      }),
    ).toBe('failed');
  });

  it('treats a finished row as applied', () => {
    expect(
      classify({
        migration_name: 'm',
        finished_at: new Date(),
        rolled_back_at: null,
        applied_steps_count: 1,
      }),
    ).toBe('applied');
  });

  it('reports a rolled back row as its own state, not as applied', () => {
    expect(
      classify({
        migration_name: 'm',
        finished_at: new Date(),
        rolled_back_at: new Date(),
        applied_steps_count: 1,
      }),
    ).toBe('rolled-back');
  });
});

describe('safeReason', () => {
  it('keeps the error code and drops everything else', () => {
    const error = Object.assign(
      new Error('password authentication failed for user "postgres" at db.abc.supabase.co:5432'),
      { code: '28P01' },
    );
    expect(safeReason(error)).toBe('database error 28P01');
  });

  it('never leaks a message when there is no code', () => {
    expect(safeReason(new Error('connect ECONNREFUSED 10.0.0.1:5432'))).not.toContain('10.0.0.1');
  });

  it('rejects a code that is not a plain identifier', () => {
    expect(safeReason({ code: 'db.abc.supabase.co' })).toBe(
      'could not reach or query the database',
    );
  });
});
