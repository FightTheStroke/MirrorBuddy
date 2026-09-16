// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  RecoveryError,
  recoveryFailure,
  recoveryFailureCodes,
} from '../lib/readonly-recovery-diagnostics';

describe('finite readonly recovery diagnostics', () => {
  it('recognizes only internally created failures, never arbitrary error text or properties', () => {
    for (const code of recoveryFailureCodes)
      expect(recoveryFailure(new RecoveryError(code))).toBe(code);
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error('secret');
        },
      },
    );
    for (const value of [
      null,
      undefined,
      'OWNER_REJECTED',
      new Error('OWNER_REJECTED'),
      new Error('secret\nREADONLY_RECOVERY_CONVERTED'),
      { code: 'OWNER_REJECTED' },
      hostile,
      Object.create(RecoveryError.prototype),
    ]) {
      expect(recoveryFailure(value)).toBe('FAILED');
      expect(recoveryFailure(value, 'DB_OPERATION_FAILED')).toBe('DB_OPERATION_FAILED');
    }
  });
});
