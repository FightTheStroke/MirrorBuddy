import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), write: vi.fn(), transaction: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { $transaction: mocks.transaction } }));
import { getSessionActivationReadiness, activateSessionLifecycle } from '../activation-readiness';

const now = new Date('2026-09-06T00:00:00Z');
const tx = { $queryRaw: mocks.query, globalConfig: { upsert: mocks.write } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((work) => work(tx));
  mocks.query.mockResolvedValue([{ now, sessionActivatedAt: null, blockedAccounts: BigInt(0) }]);
});

describe('manual activation readiness', () => {
  it('reports NOT_ACTIVATED without writing any activation', async () => {
    const result = await getSessionActivationReadiness();
    expect(result).toMatchObject({
      status: 'NOT_ACTIVATED',
      blockedAccounts: 0,
      canActivate: true,
    });
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it('blocks the manual write when any unrecoverable legacy-only account exists', async () => {
    mocks.query.mockResolvedValue([{ now, sessionActivatedAt: null, blockedAccounts: BigInt(1) }]);
    await expect(activateSessionLifecycle()).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it('writes database time only after readiness succeeds in the same transaction', async () => {
    const result = await activateSessionLifecycle();
    expect(result.activatedAt).toEqual(now);
    expect(mocks.write).toHaveBeenCalledWith({
      where: { id: 'global' },
      create: { id: 'global', sessionActivatedAt: now },
      update: { sessionActivatedAt: now },
    });
  });
  it('returns the existing anchor unchanged on repeated manual activation', async () => {
    const activatedAt = new Date(now.getTime() - 86_400_000);
    mocks.query.mockResolvedValue([
      { now, sessionActivatedAt: activatedAt, blockedAccounts: BigInt(0) },
    ]);
    expect(await activateSessionLifecycle()).toMatchObject({ activatedAt });
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it.each([null, [], [{ now, sessionActivatedAt: null, blockedAccounts: null }]])(
    'rejects invalid database metadata rather than declaring readiness',
    async (value) => {
      mocks.query.mockResolvedValue(value);
      await expect(activateSessionLifecycle()).rejects.toThrow();
      expect(mocks.write).not.toHaveBeenCalled();
    },
  );
  it('surfaces unavailable schema and never activates on a database error', async () => {
    mocks.query.mockRejectedValue(new Error('missing schema'));
    await expect(activateSessionLifecycle()).rejects.toThrow('missing schema');
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
