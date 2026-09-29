/**
 * Sentry MIRRORBUDDY-3M/3K (#1201, #1202): a student who answered the consent
 * banner while /api/auth/me was still in flight got "Consent identity" errors,
 * because the operation read a pending identity. The UI now waits for the
 * identity check to settle before running the consent operation.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { setClientIdentity } from '@/lib/auth';
import { getConsentIdentity } from '@/lib/consent/consent-sync-state';
import { resetConsentSnapshot } from '@/lib/consent/consent-store';
import { useConsentUI } from '../use-consent-ui';
import { installConsentUITransport } from './consent-ui-fixture';

describe('consent answered while the identity check is still running', () => {
  afterEach(() => {
    resetConsentSnapshot();
    setClientIdentity({ status: 'anonymous' });
    vi.restoreAllMocks();
  });

  it('runs the operation once the identity settles instead of failing', async () => {
    installConsentUITransport(true);
    setClientIdentity({ status: 'pending' });
    const { result } = renderHook(() => useConsentUI());
    const operation = vi.fn(() => {
      getConsentIdentity();
    });

    let outcome: Promise<boolean> | undefined;
    act(() => {
      outcome = result.current.run(operation);
    });
    await act(async () => {
      setClientIdentity({ status: 'anonymous' });
      await Promise.resolve();
    });

    await expect(outcome).resolves.toBe(true);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
