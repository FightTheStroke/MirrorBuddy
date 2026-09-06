import { beforeEach, expect, it, vi } from 'vitest';
const transaction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ prisma: { $transaction: transaction } }));
import { sessionTransaction } from '../session-transaction';
import { SessionReadError } from '../session-policy';

beforeEach(() => vi.resetAllMocks());
const adapterConflict = () =>
  Object.assign(new Error('TransactionWriteConflict'), {
    name: 'DriverAdapterError',
    cause: { kind: 'TransactionWriteConflict', originalCode: '40001' },
  });
it.each([
  { code: 'P2034' },
  adapterConflict(),
  new SessionReadError('DATABASE_FAILURE', adapterConflict()),
])(
  'retries supported Prisma serialization failures, including adapter commit errors',
  async (failure) => {
    transaction.mockRejectedValueOnce(failure).mockResolvedValueOnce('committed');
    expect(await sessionTransaction(async () => 'committed')).toBe('committed');
    expect(transaction).toHaveBeenCalledTimes(2);
  },
);
it('stops after three transaction attempts and preserves the failure', async () => {
  const failure = adapterConflict();
  transaction.mockRejectedValue(failure);
  await expect(sessionTransaction(async () => 'unused')).rejects.toBe(failure);
  expect(transaction).toHaveBeenCalledTimes(3);
});
it('does not retry arbitrary errors or hide failed transactions', async () => {
  const failure = new Error('database unavailable');
  transaction.mockRejectedValue(failure);
  await expect(sessionTransaction(async () => 'unused')).rejects.toBe(failure);
  expect(transaction).toHaveBeenCalledTimes(1);
});
