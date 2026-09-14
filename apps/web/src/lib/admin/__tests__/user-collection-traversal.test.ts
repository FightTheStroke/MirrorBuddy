// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/users/route';
import { collectUserExport, collectUserSelection } from '../user-list-export';
import { parseUserListQuery, USER_LIST_ORDER } from '../user-list-query';

const db = vi.hoisted(() => ({
  user: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  deletedUserBackup: { count: vi.fn() },
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    ...db,
    $transaction: (work: (client: typeof db) => Promise<unknown>) => work(db),
  },
}));
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._guards: unknown[]) =>
    (handler: (context: { req: NextRequest }) => Promise<Response>) =>
    (req: NextRequest) =>
      handler({ req }),
  withSentry: vi.fn(),
  withAdminReadOnly: vi.fn(),
}));

interface Where {
  id?: string | { in: string[] };
  isTestData?: boolean;
  disabled?: boolean;
}
const row = (index: number, match: boolean) => ({
  id: String(10_000 - index),
  username: `person${index}`,
  email: `${match ? 'target' : 'ordinary'}${index}@example.com`,
  role: 'USER',
  disabled: false,
  isTestData: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  subscription: null,
});
type Row = ReturnType<typeof row>;
let rows: Row[] = [];
let traversed = 0;
function filtered(where: Where = {}) {
  return rows.filter(
    (item) =>
      (where.isTestData === undefined || item.isTestData === where.isTestData) &&
      (where.disabled === undefined || item.disabled === where.disabled) &&
      (typeof where.id === 'string'
        ? item.id === where.id
        : !where.id || where.id.in.includes(item.id)),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  traversed = 0;
  db.deletedUserBackup.count.mockResolvedValue(0);
  db.user.count.mockImplementation(
    async ({ where }: { where?: Where } = {}) => filtered(where).length,
  );
  db.user.findFirst.mockImplementation(
    async ({ where, cursor, skip }: { where?: Where; cursor?: { id: string }; skip?: number }) => {
      const source = filtered(where);
      const index = cursor ? source.findIndex((item) => item.id === cursor.id) + (skip ?? 0) : 0;
      const found = source[index];
      return found ? { id: found.id } : null;
    },
  );
  db.user.findMany.mockImplementation(
    async (args: {
      where?: Where;
      take: number;
      skip?: number;
      cursor?: { id: string };
      orderBy: unknown;
    }) => {
      expect(args.take).toBeLessThanOrEqual(100);
      expect(args.orderBy).toEqual(USER_LIST_ORDER);
      const source = filtered(args.where);
      const start = args.cursor
        ? source.findIndex((item) => item.id === args.cursor?.id) + (args.skip ?? 0)
        : (args.skip ?? 0);
      const result = source.slice(start, start + args.take);
      traversed += result.length;
      return result;
    },
  );
});

describe.each([
  { name: 'export', collect: collectUserExport },
  { name: 'select all', collect: collectUserSelection },
])('actual $name read surface uses one candidate traversal', ({ collect }) => {
  it.each([
    { size: 250, sparse: false },
    { size: 600, sparse: true },
  ])(
    'does not rescan candidates across collection pages ($size, sparse=$sparse)',
    async ({ size, sparse }) => {
      rows = Array.from({ length: size }, (_, index) =>
        row(index, !sparse || (index >= 200 && index % 3 === 0)),
      );
      const requests: string[] = [];
      const output = await collect(
        parseUserListQuery({ search: 'target', staging: 'true' }),
        async (url) => {
          requests.push(url);
          return GET(new NextRequest(new URL(url, 'http://localhost')));
        },
      );
      expect(output).toHaveLength(rows.filter((item) => item.email.startsWith('target')).length);
      // Count rows crossing the real query/PII-result boundary, not simulated crypto or ORM proof.
      expect(traversed).toBe(size);
      expect(
        requests.every(
          (url) => new URL(url, 'http://localhost').searchParams.get('collection') === 'cursor',
        ),
      ).toBe(true);
      expect(requests.length).toBe(Math.ceil(size / 100));
    },
  );

  it('fails instead of silently continuing when the candidate population changes', async () => {
    rows = Array.from({ length: 250 }, (_, index) => row(index, true));
    let requests = 0;
    await expect(
      collect(parseUserListQuery({ search: 'target', staging: 'true' }), async (url) => {
        if (++requests === 2) rows.pop();
        return GET(new NextRequest(new URL(url, 'http://localhost')));
      }),
    ).rejects.toThrow();
    expect(traversed).toBe(100);
  });

  it('fails on a missing cursor anchor even when the candidate count stays unchanged', async () => {
    rows = Array.from({ length: 250 }, (_, index) => row(index, true));
    let requests = 0;
    await expect(
      collect(parseUserListQuery({ search: 'target', staging: 'true' }), async (url) => {
        if (++requests === 2) rows[99] = { ...rows[99], id: 'replacement-anchor' };
        return GET(new NextRequest(new URL(url, 'http://localhost')));
      }),
    ).rejects.toThrow();
    expect(traversed).toBe(100);
  });
});

describe('collection continuation input bounds', () => {
  it('does not trust forged progress to declare completion while later candidates remain', async () => {
    rows = Array.from({ length: 250 }, (_, index) => row(index, true));
    const response = await GET(
      new NextRequest(
        `http://localhost/api/admin/users?collection=cursor&staging=true&pageSize=100&cursor=${rows[99].id}&candidates=250&processed=150`,
      ),
    );
    expect(response.status).toBe(409);
  });

  it.each([
    'collection=all',
    'collection=cursor&tab=trash',
    'collection=cursor&page=2',
    'collection=cursor&cursor=x',
    'collection=cursor&cursor=x&candidates=10&processed=11',
    'collection=cursor&cursor=x&cursor=y&candidates=10&processed=1',
  ])('rejects malformed or inapplicable continuation %s before querying', async (query) => {
    const response = await GET(new NextRequest(`http://localhost/api/admin/users?${query}`));
    expect(response.status).toBe(400);
    expect(db.user.findMany).not.toHaveBeenCalled();
    expect(db.user.count).not.toHaveBeenCalled();
  });
});
