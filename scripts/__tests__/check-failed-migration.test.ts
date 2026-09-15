// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { classify, safeReason } from '../check-failed-migration';

const row = (overrides: Partial<Parameters<typeof classify>[0][number]> = {}) => ({
  migration_name: '20260906013848_add_studykit_original_text',
  finished_at: null,
  rolled_back_at: null,
  applied_steps_count: 0,
  ...overrides,
});

describe('classify', () => {
  it('treats no rows as never attempted', () => {
    expect(classify([])).toBe('absent');
  });

  it('treats an unfinished row as the failed state Prisma blocks on', () => {
    expect(classify([row()])).toBe('failed');
  });

  it('treats a finished row as applied', () => {
    expect(classify([row({ finished_at: new Date(), applied_steps_count: 1 })])).toBe('applied');
  });

  it('reports a rolled back row as its own state, not as applied', () => {
    expect(classify([row({ finished_at: new Date(), rolled_back_at: new Date() })])).toBe(
      'rolled-back',
    );
  });

  // `resolve --applied` rolls the failed row back and inserts a new applied one.
  it('reads a repaired migration as applied despite the rolled back row it leaves', () => {
    expect(
      classify([
        row({ rolled_back_at: new Date() }),
        row({ finished_at: new Date(), applied_steps_count: 1 }),
      ]),
    ).toBe('applied');
  });

  it('still sees a retry after a rollback as failed', () => {
    expect(classify([row({ rolled_back_at: new Date() }), row()])).toBe('failed');
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
