import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  counts: vi.fn(),
  trials: vi.fn(),
  users: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: mocks.query,
    funnelEvent: { groupBy: mocks.counts },
    trialSession: { findMany: mocks.trials },
    user: { findMany: mocks.users },
  },
}));
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._steps: unknown[]) =>
    (handler: unknown) =>
      handler,
  withSentry: vi.fn(),
  withAdminReadOnly: vi.fn(),
}));

const request = (query = '') =>
  GET({
    req: new Request(`http://localhost/api/admin/funnel/users?${query}`),
  } as never);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
  mocks.query.mockResolvedValue([]);
  mocks.counts.mockResolvedValue([]);
  mocks.trials.mockResolvedValue([]);
  mocks.users.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe('funnel users query', () => {
  it.each(['VISITOR', 'ACTIVE'])(
    'binds the valid %s stage after selecting the latest event',
    async (stage) => {
      const response = await request(`stage=${stage}`);
      expect(response.status).toBe(200);
      const query = mocks.query.mock.calls[0][0];
      expect(query.values).toContain(stage);
      expect(query.sql).not.toContain(stage);
      expect(query.sql.indexOf('WHERE "stage"')).toBeGreaterThan(query.sql.indexOf('ORDER BY'));
    },
  );

  it.each(['UNKNOWN', "' OR 1=1 --", 'visitor'])(
    'rejects an invalid stage without querying: %s',
    async (stage) => {
      const response = await request(new URLSearchParams({ stage }).toString());
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty('error');
      expect(mocks.query).not.toHaveBeenCalled();
      expect(mocks.counts).not.toHaveBeenCalled();
    },
  );

  it('applies the selected period to both participants and event counts', async () => {
    expect((await request('days=30')).status).toBe(200);
    const query = mocks.query.mock.calls[0][0];
    const since = new Date('2026-09-23T12:00:00Z');
    expect(query.values).toContainEqual(since);
    expect(mocks.counts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isTestData: false, createdAt: { gte: since } },
      }),
    );
  });

  it('preserves the all-time API range when no days parameter is supplied', async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(mocks.counts).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isTestData: false },
      }),
    );
  });

  it.each(['days=bad', 'days=0', 'days=-1', 'days=366', 'page=bad', 'pageSize=bad'])(
    'rejects invalid range or pagination: %s',
    async (query) => {
      expect((await request(query)).status).toBe(400);
      expect(mocks.query).not.toHaveBeenCalled();
    },
  );
});
