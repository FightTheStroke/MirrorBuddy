import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistFeaturePolicy } from '../policy-write-persistence';
import { PolicyWriteCoordinator } from '../policy-write-coordinator';
import type { PolicyState } from '../policy-write-types';

const transaction = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock('@/lib/db', () => ({ prisma: { $transaction: transaction } }));

const adapterConflict = () =>
  Object.assign(new Error('not used for classification'), {
    name: 'DriverAdapterError',
    cause: { kind: 'TransactionWriteConflict', originalCode: '40001' },
  });
const prismaConflict = () =>
  Object.assign(new Error('not used for classification'), {
    code: 'P2034',
  });

describe('bounded policy transaction retries at the acknowledgement boundary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    transaction.mockReset().mockResolvedValue();
  });
  afterEach(() => {
    try {
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it.each([adapterConflict, prismaConflict])(
    'retries a verified conflict before confirmation: %s',
    async (conflict) => {
      transaction.mockRejectedValueOnce(conflict());
      const confirmation = expect(
        persistFeaturePolicy('owned-policy', { killSwitch: false }),
      ).resolves.toBeUndefined();
      await vi.runAllTimersAsync();
      await confirmation;
      expect(transaction).toHaveBeenCalledTimes(2);
    },
  );

  it.each([adapterConflict, prismaConflict])('allows exactly two retries: %s', async (conflict) => {
    transaction.mockRejectedValueOnce(conflict()).mockRejectedValueOnce(conflict());
    const confirmation = expect(
      persistFeaturePolicy('owned-policy', { killSwitch: false }),
    ).resolves.toBeUndefined();
    await vi.runAllTimersAsync();
    await confirmation;
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it.each([adapterConflict, prismaConflict])(
    'never starts a fourth attempt: %s',
    async (conflict) => {
      const error = conflict();
      transaction.mockRejectedValue(error);
      const failure = expect(
        persistFeaturePolicy('owned-policy', { killSwitch: false }),
      ).rejects.toBe(error);
      await vi.runAllTimersAsync();
      await failure;
      expect(transaction).toHaveBeenCalledTimes(3);
    },
  );

  it.each([adapterConflict, prismaConflict])(
    'spaces only verified retries by 10ms then 20ms: %s',
    async (conflict) => {
      transaction.mockRejectedValueOnce(conflict()).mockRejectedValueOnce(conflict());
      const confirmation = expect(
        persistFeaturePolicy('owned-policy', { killSwitch: false }),
      ).resolves.toBeUndefined();
      await vi.advanceTimersByTimeAsync(9);
      expect(transaction).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(transaction).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(19);
      expect(transaction).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      await confirmation;
      expect(transaction).toHaveBeenCalledTimes(3);
    },
  );

  it.each([
    null,
    undefined,
    'P2034',
    'TransactionWriteConflict',
    {},
    new Error('TransactionWriteConflict 40001 P2034'),
    { code: 'ECONNRESET' },
    { code: 'P2028', cause: { kind: 'TransactionWriteConflict', originalCode: '40001' } },
    { name: 'DriverAdapterError' },
    { name: 'DriverAdapterError', cause: null },
    { name: 'DriverAdapterError', cause: 'TransactionWriteConflict' },
    { name: 'DriverAdapterError', cause: { kind: 'TransactionWriteConflict' } },
    { name: 'DriverAdapterError', cause: { originalCode: '40001' } },
    {
      name: 'DriverAdapterError',
      cause: { kind: 'TransactionWriteConflict', originalCode: 40001 },
    },
    {
      name: 'DriverAdapterError',
      cause: { kind: 'TransactionWriteConflict', originalCode: '40P01' },
    },
    {
      name: 'DriverAdapterError',
      cause: { kind: 'TransactionWriteConflict', originalCode: '08006' },
    },
    { name: 'DriverAdapterError', cause: { kind: 'ConnectionClosed', originalCode: '40001' } },
    { name: 'Error', cause: { kind: 'TransactionWriteConflict', originalCode: '40001' } },
    { cause: adapterConflict() },
  ])('does not retry unknown or ambiguous failures: %j', async (error) => {
    transaction.mockRejectedValue(error);
    await expect(persistFeaturePolicy('owned-policy', { killSwitch: false })).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it.each([adapterConflict, prismaConflict])(
    'stops if a retry loses its acknowledgement: %s',
    async (conflict) => {
      const lost = Object.assign(new Error('Commit response lost'), { code: 'ECONNRESET' });
      transaction.mockRejectedValueOnce(conflict()).mockRejectedValueOnce(lost);
      const failure = expect(
        persistFeaturePolicy('owned-policy', { killSwitch: false }),
      ).rejects.toBe(lost);
      await vi.runAllTimersAsync();
      await failure;
      expect(transaction).toHaveBeenCalledTimes(2);
    },
  );

  it('retains protection and leaves the queue usable after retry exhaustion', async () => {
    let state: PolicyState = { killSwitch: true, status: 'enabled', enabledPercentage: 100 };
    const queue = new PolicyWriteCoordinator(
      () => state,
      (_key, patch) => {
        state = { ...state, ...patch };
      },
    );
    const error = adapterConflict();
    transaction
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error);
    const persist = (patch: Parameters<typeof queue.write>[1]) =>
      persistFeaturePolicy('owned-policy', patch);
    const release = queue.write('owned-policy', { killSwitch: false }, 'admin', persist);
    const failure = expect(release.completion).rejects.toMatchObject({
      cause: error,
      persistence: 'unconfirmed',
      effective: { killSwitch: true },
    });
    const next = queue.write('owned-policy', { metadata: { next: true } }, 'admin', persist);
    expect(state.killSwitch).toBe(true);
    await vi.runAllTimersAsync();
    await failure;
    expect(await next.completion).toMatchObject({
      persistence: 'confirmed',
      effective: { killSwitch: true, metadata: { next: true } },
    });
    expect(transaction).toHaveBeenCalledTimes(4);
    expect(
      await queue.write('owned-policy', { killSwitch: false }, 'admin', persist).completion,
    ).toMatchObject({ persistence: 'confirmed', effective: { killSwitch: false } });
    expect(transaction).toHaveBeenCalledTimes(5);
  });
});
