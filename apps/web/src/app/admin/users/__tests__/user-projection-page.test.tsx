import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminUsersPage from '../page';
import type { UserListPage } from '@/lib/admin/user-list-types';
import { parseUserListQuery } from '@/lib/admin/user-list-query';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  role: vi.fn(),
  tiers: vi.fn(),
  list: vi.fn(),
  table: vi.fn(),
}));
vi.mock('@/lib/auth/server', () => ({ validateAdminReadOnlyAuth: mocks.auth }));
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mocks.role },
    tierDefinition: { findMany: mocks.tiers },
  },
}));
vi.mock('@/lib/admin/user-list-service', () => ({ getUserList: mocks.list }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
vi.mock('../users-table', () => ({
  UsersTable: (props: { canManage: boolean; listing: UserListPage }) => {
    mocks.table(props);
    return <span>{props.canManage ? 'owner' : 'readonly'}</span>;
  },
}));

const page: UserListPage = {
  query: parseUserListQuery(),
  users: [],
  backups: [],
  total: 0,
  totalPages: 1,
  totalUsers: 0,
  stagingCount: 0,
  trashTotal: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({
    authenticated: true,
    canAccessAdminReadOnly: true,
    userId: 'viewer',
  });
  mocks.role.mockResolvedValue({ role: 'ADMIN' });
  mocks.tiers.mockResolvedValue([]);
  mocks.list.mockResolvedValue(page);
});

describe('actual SSR users page wiring (boundary fixtures, not ORM/auth proof)', () => {
  it.each(['ADMIN', 'ADMIN_READONLY'])(
    'uses the same bounded listing and projection for %s',
    async (role) => {
      mocks.role.mockResolvedValue({ role });
      const params = {
        page: '2',
        pageSize: '100',
        tab: 'active',
        search: 'target',
        staging: 'true',
      };
      renderToStaticMarkup(await AdminUsersPage({ searchParams: Promise.resolve(params) }));
      expect(mocks.list).toHaveBeenCalledWith(params);
      expect(mocks.table).toHaveBeenCalledWith(
        expect.objectContaining({
          listing: page,
          canManage: role === 'ADMIN',
        }),
      );
      expect(mocks.role).toHaveBeenCalledWith({ where: { id: 'viewer' }, select: { role: true } });
    },
  );

  it('does not load user data before the existing readonly-aware authorization succeeds', async () => {
    mocks.auth.mockResolvedValue({ authenticated: false, canAccessAdminReadOnly: false });
    await expect(AdminUsersPage()).rejects.toThrow('redirect:/login');
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('does not expose database error text in the rendered failure surface', async () => {
    mocks.list.mockRejectedValue(new Error('private database connection details'));
    const html = renderToStaticMarkup(await AdminUsersPage());
    expect(html).not.toContain('private database connection details');
    expect(html).toContain('role="alert"');
  });
});
