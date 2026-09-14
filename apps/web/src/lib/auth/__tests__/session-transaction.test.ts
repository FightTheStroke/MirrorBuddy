import { beforeEach, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
const transaction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ prisma: { $transaction: transaction } }));
import { sessionTransaction } from '../session-transaction';
import { SessionReadError } from '../session-policy';

beforeEach(() => vi.resetAllMocks());
const adapterConflict = (originalCode: '40001' | '40P01' = '40001') =>
  Object.assign(new Error('TransactionWriteConflict'), {
    name: 'DriverAdapterError',
    cause: { kind: 'TransactionWriteConflict', originalCode },
  });
const rawQueryFailure = (driverAdapterError: unknown) =>
  new Prisma.PrismaClientKnownRequestError('Raw query conflict', {
    code: 'P2010',
    clientVersion: Prisma.prismaVersion.client,
    meta: { driverAdapterError },
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

it.each([
  ['40001', false],
  ['40P01', false],
  ['40001', true],
  ['40P01', true],
] as const)(
  'reruns the full operation for raw conflict %s, read wrapper %s',
  async (code, wrapped) => {
    const rawFailure = rawQueryFailure(adapterConflict(code));
    const failure = wrapped ? new SessionReadError('DATABASE_FAILURE', rawFailure) : rawFailure;
    const work = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce('committed');
    transaction.mockImplementation((operation: () => Promise<string>) => operation());

    await expect(sessionTransaction(work)).resolves.toBe('committed');

    expect(work).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenCalledTimes(2);
    const options = { isolationLevel: 'Serializable', maxWait: 5_000, timeout: 10_000 };
    expect(transaction).toHaveBeenNthCalledWith(1, work, options);
    expect(transaction).toHaveBeenNthCalledWith(2, work, options);
  },
);

it.each([false, true])(
  'preserves the raw conflict after three attempts, read wrapper %s',
  async (wrapped) => {
    const rawFailure = rawQueryFailure(adapterConflict());
    const failure = wrapped ? new SessionReadError('DATABASE_FAILURE', rawFailure) : rawFailure;
    transaction.mockRejectedValue(failure);

    await expect(sessionTransaction(async () => 'unused')).rejects.toBe(failure);

    expect(transaction).toHaveBeenCalledTimes(3);
  },
);

it.each([
  null,
  undefined,
  '40001',
  { code: 'P2010' },
  { code: 'P2010', meta: null },
  { code: 'P2010', meta: undefined },
  { code: 'P2010', meta: '40001' },
  { code: 'P2010', meta: { code: '40001' } },
  { code: 'P2010', meta: { originalError: adapterConflict() } },
  { code: 'P2028', meta: { driverAdapterError: adapterConflict() } },
  { code: 2010, meta: { driverAdapterError: adapterConflict() } },
  { meta: { driverAdapterError: adapterConflict() } },
  rawQueryFailure(null),
  rawQueryFailure(undefined),
  rawQueryFailure('40001'),
  rawQueryFailure({ cause: { kind: 'TransactionWriteConflict', originalCode: '40001' } }),
  rawQueryFailure({
    name: 'OtherError',
    cause: { kind: 'TransactionWriteConflict', originalCode: '40001' },
  }),
  rawQueryFailure({ name: 'DriverAdapterError', cause: null }),
  rawQueryFailure({ name: 'DriverAdapterError', cause: undefined }),
  rawQueryFailure({ name: 'DriverAdapterError', cause: '40001' }),
  rawQueryFailure({
    name: 'DriverAdapterError',
    cause: { kind: 'OtherConflict', originalCode: '40001' },
  }),
  rawQueryFailure({
    name: 'DriverAdapterError',
    cause: { kind: 'TransactionWriteConflict', originalCode: '23505' },
  }),
  rawQueryFailure({ name: 'DriverAdapterError', cause: { kind: 'TransactionWriteConflict' } }),
  rawQueryFailure({ name: 'DriverAdapterError', cause: { originalCode: '40001' } }),
  new SessionReadError(
    'DATABASE_FAILURE',
    rawQueryFailure({ name: 'DriverAdapterError', cause: null }),
  ),
])('does not retry unsupported or malformed raw-query failure %#', async (failure) => {
  transaction.mockRejectedValue(failure);

  await expect(sessionTransaction(async () => 'unused')).rejects.toBe(failure);

  expect(transaction).toHaveBeenCalledTimes(1);
});
