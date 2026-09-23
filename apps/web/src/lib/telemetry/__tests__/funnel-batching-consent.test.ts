import { beforeEach, expect, it, vi } from 'vitest';
import { processBatchFunnelEvents } from '@/lib/funnel/batch-funnel';
import { analyticsConsentFixture } from './analytics-fixtures';

interface Setting {
  userId: string;
  azureCostConfig: string;
}
const db = vi.hoisted(() => ({
  list: vi.fn(),
  settings: vi.fn(),
  profile: vi.fn(),
  aggregate: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    settings: { findMany: db.list, findUnique: db.settings },
    profile: {
      findUnique: db.profile,
      findMany: async ({ where }: { where: { userId: { in: string[] } } }) =>
        where.userId.in.map((userId) => ({ userId, age: 18 })),
    },
    funnelEvent: { findFirst: async () => null, create: db.create },
    $queryRaw: db.aggregate,
  },
}));
let rows: Setting[];
let revoked: string | undefined;
const processedIds = new Set<string>();
const row = (index: number, analytics = true): Setting => ({
  userId: `user-${String(index).padStart(4, '0')}`,
  azureCostConfig: JSON.stringify({ consent: { ...analyticsConsentFixture, analytics } }),
});
function queryIds(values: unknown[]): string[] {
  return values.flatMap((value) => {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('values' in value) ||
      !Array.isArray(value.values)
    )
      return [];
    return value.values.filter((id): id is string => typeof id === 'string');
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  revoked = undefined;
  processedIds.clear();
  rows = Array.from({ length: 501 }, (_, i) => row(i, i % 10 !== 0));
  db.list.mockImplementation(
    async (query: { take?: number; where?: { userId?: { gt?: string } } }) =>
      rows
        .filter((setting) => setting.userId > (query.where?.userId?.gt ?? ''))
        .slice(0, query.take ?? rows.length),
  );
  db.settings.mockImplementation(async ({ where }: { where: { userId: string } }) =>
    where.userId === revoked ? null : rows.find((setting) => setting.userId === where.userId),
  );
  db.profile.mockResolvedValue({ age: 18 });
  db.create.mockResolvedValue({});
  db.aggregate.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const ids = queryIds(values);
    if (ids.length > 200) throw new Error('Unbounded SQL parameter population');
    for (const id of ids) {
      const setting = rows.find((item) => item.userId === id);
      expect(JSON.parse(setting!.azureCostConfig).consent.analytics).toBe(true);
      processedIds.add(id);
    }
    if (ids.includes('user-0499')) revoked = 'user-0499';
    if (strings.join('').includes('"StudySession"')) {
      return ids.map((userId) => ({ userId, sessionCount: BigInt(4) }));
    }
    return [];
  });
});

it('pages more than one batch without truncation, reuses eligibility for both aggregations and rechecks before write', async () => {
  const result = await processBatchFunnelEvents();
  const expected = rows.filter((setting) => JSON.parse(setting.azureCostConfig).consent.analytics);
  expect(result).toEqual({ activeRecorded: expected.length - 1, churnedRecorded: 0, errors: 0 });
  expect(processedIds).toEqual(new Set(expected.map((setting) => setting.userId)));
  expect(db.list).toHaveBeenCalledTimes(3);
  expect(
    db.list.mock.calls.every(([query]) => query.take <= 200 && query.orderBy.userId === 'asc'),
  ).toBe(true);
  expect(db.aggregate).toHaveBeenCalledTimes(6);
  expect(db.create.mock.calls.some(([input]) => input.data.userId === 'user-0499')).toBe(false);
  expect(db.create.mock.calls.some(([input]) => input.data.userId === 'user-0498')).toBe(true);
});

it('continues past a whole page with no eligible accounts', async () => {
  rows = Array.from({ length: 201 }, (_, i) => row(i, i === 200));
  expect(await processBatchFunnelEvents()).toEqual({
    activeRecorded: 1,
    churnedRecorded: 0,
    errors: 0,
  });
  expect(db.list).toHaveBeenCalledTimes(2);
  expect(processedIds).toEqual(new Set(['user-0200']));
});

it('reports a later page failure explicitly rather than silently claiming complete coverage', async () => {
  db.list
    .mockResolvedValueOnce(rows.slice(0, 200))
    .mockRejectedValueOnce(new Error('Consent page unavailable'));
  expect(await processBatchFunnelEvents()).toEqual({
    activeRecorded: 180,
    churnedRecorded: 0,
    errors: 1,
  });
  expect(db.list).toHaveBeenCalledTimes(2);
});
