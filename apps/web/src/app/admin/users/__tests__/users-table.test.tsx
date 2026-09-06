import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UsersTable } from '../users-table';
import { getTranslation } from '@/test/i18n-helpers';
import { parseUserListQuery } from '@/lib/admin/user-list-query';
import type { ListedUser, UserListPage } from '@/lib/admin/user-list-types';

const mocks = vi.hoisted(() => ({ csrf: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/auth', () => ({ csrfFetch: (...args: unknown[]) => mocks.csrf(...args) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
const users: ListedUser[] = [
  {
    id: 'user-1',
    username: 'alpha',
    email: 'alpha@example.com',
    role: 'USER',
    disabled: false,
    isTestData: false,
    createdAt: '2026-01-01T00:00:00Z',
    subscription: null,
  },
  {
    id: 'user-2',
    username: 'beta',
    email: 'beta@example.com',
    role: 'ADMIN_READONLY',
    disabled: true,
    isTestData: false,
    createdAt: '2026-01-01T00:00:00Z',
    subscription: null,
  },
];
function listing(patch: Partial<UserListPage> = {}): UserListPage {
  return {
    query: parseUserListQuery(),
    users,
    backups: [],
    total: 60,
    totalPages: 3,
    totalUsers: 60,
    stagingCount: 4,
    trashTotal: 3,
    ...patch,
  };
}
function table(patch: Partial<UserListPage> = {}, canManage = true) {
  return <UsersTable listing={listing(patch)} availableTiers={[]} canManage={canManage} />;
}
function pushed() {
  return new URL(mocks.push.mock.calls.at(-1)?.[0], 'http://localhost').searchParams;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  Object.defineProperty(window, 'location', { value: { reload: vi.fn() }, writable: true });
  mocks.csrf.mockResolvedValue({ ok: true, json: async () => ({}) });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('actual users table with server-owned pagination/filtering', () => {
  it('navigates filters to the server instead of filtering only the loaded page', () => {
    const { rerender } = render(table());
    fireEvent.click(
      screen.getByRole('tab', {
        name: (name) => name.startsWith(getTranslation('admin.users.tabs.active')),
      }),
    );
    expect(pushed().get('tab')).toBe('active');
    expect(pushed().get('page')).toBe('1');
    expect(screen.getByText('beta')).toBeInTheDocument();
    rerender(
      table({
        query: parseUserListQuery({ tab: 'active' }),
        users: [users[0]],
        total: 1,
        totalPages: 1,
      }),
    );
    expect(screen.queryByText('beta')).toBeNull();
  });

  it('submits search against the full server dataset and resets pagination', () => {
    render(table({ query: parseUserListQuery({ page: '2' }) }));
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'outside-page@example.com' } });
    fireEvent.submit(search.closest('form')!);
    expect(pushed().get('search')).toBe('outside-page@example.com');
    expect(pushed().get('page')).toBe('1');
  });

  it('preserves a newer unsent search draft when an older search response arrives', () => {
    const { rerender } = render(table());
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'alpha' } });
    fireEvent.submit(search.closest('form')!);
    fireEvent.change(search, { target: { value: 'alphabet' } });
    rerender(table({ query: parseUserListQuery({ search: 'alpha' }) }));
    expect(screen.getByRole('searchbox')).toHaveValue('alphabet');
  });

  it('preserves server filters and staging across page navigation', () => {
    render(
      table({
        query: parseUserListQuery({
          search: 'alpha',
          tab: 'active',
          staging: 'true',
          pageSize: '25',
        }),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: getTranslation('admin.next') }));
    expect(Object.fromEntries(pushed())).toMatchObject({
      page: '2',
      pageSize: '25',
      tab: 'active',
      staging: 'true',
      search: 'alpha',
    });
  });

  it('keeps selections across pages for the existing CSRF-protected bulk actions', async () => {
    const { rerender } = render(table());
    fireEvent.click(screen.getByRole('checkbox', { name: (name) => name.includes('alpha') }));
    const other = { ...users[0], id: 'user-3', username: 'gamma' };
    rerender(table({ query: parseUserListQuery({ page: '2' }), users: [other] }));
    fireEvent.click(screen.getByRole('checkbox', { name: (name) => name.includes('gamma') }));
    fireEvent.click(
      screen.getByRole('button', { name: getTranslation('admin.users.bulkActions.disable') }),
    );
    await waitFor(() => expect(mocks.csrf).toHaveBeenCalledTimes(2));
    expect(mocks.csrf).toHaveBeenCalledWith(
      '/api/admin/users/user-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(mocks.csrf).toHaveBeenCalledWith(
      '/api/admin/users/user-3',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('retains one-click selection of all matching users beyond the displayed page', async () => {
    const all = [...users, { ...users[0], id: 'user-3', username: 'gamma' }];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          query: parseUserListQuery({ pageSize: '100' }),
          users: all,
          collection: {
            cursor: null,
            nextCursor: null,
            candidateCount: 3,
            scanned: 3,
            processed: 3,
            complete: true,
          },
        }),
      ),
    );
    render(table({ total: 3, totalPages: 1 }));
    fireEvent.click(
      screen.getByRole('button', {
        name: getTranslation('admin.users.pagination.selectMatching', { count: 3 }),
      }),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: getTranslation('admin.users.bulkActions.disable'),
      }),
    );
    await waitFor(() => expect(mocks.csrf).toHaveBeenCalledTimes(3));
    expect(mocks.csrf).toHaveBeenCalledWith(
      '/api/admin/users/user-3',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('renders identical row data read-only, blocks mutation controls and retains details navigation', () => {
    render(table({}, false));
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('ADMIN_READONLY')).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: getTranslation('admin.users.pagination.selectPage') }),
    ).toBeNull();
    for (const button of screen.getAllByRole('button', {
      name: getTranslation('admin.deleteUser'),
    })) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(mocks.csrf).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getAllByRole('button', { name: getTranslation('admin.viewUserDetails') })[0],
    );
    expect(mocks.push).toHaveBeenCalledWith('/admin/users/user-1');
  });

  it('uses the server-provided bounded trash and preserves restoration', async () => {
    render(
      table({
        query: parseUserListQuery({ tab: 'trash' }),
        users: [],
        backups: [
          {
            userId: 'user-3',
            username: 'gamma',
            email: 'gamma@example.com',
            deletedAt: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
        totalPages: 1,
      }),
    );
    expect(screen.getByText('gamma')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: getTranslation('admin.users.restore') }));
    await waitFor(() =>
      expect(mocks.csrf).toHaveBeenCalledWith(
        '/api/admin/users/trash/user-3/restore',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('does not offer restore or empty-trash mutations to read-only viewers', () => {
    render(
      table(
        {
          query: parseUserListQuery({ tab: 'trash' }),
          users: [],
          backups: [
            { userId: 'user-3', username: 'gamma', email: null, deletedAt: '2026-01-01T00:00:00Z' },
          ],
        },
        false,
      ),
    );
    expect(
      screen.getByRole('button', { name: getTranslation('admin.users.restore') }),
    ).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: getTranslation('admin.svuotaCestino') }),
    ).toBeNull();
    expect(
      screen.queryByRole('checkbox', { name: getTranslation('admin.showStagingData') }),
    ).toBeNull();
    expect(
      screen.queryByText((text) => text.includes(getTranslation('admin.stagingRecordsHidden'))),
    ).toBeNull();
  });

  it('preserves the owner deletion route and CSRF client', async () => {
    render(table());
    fireEvent.click(screen.getAllByRole('button', { name: getTranslation('admin.deleteUser') })[0]);
    fireEvent.click(
      await screen.findByRole('button', {
        name: getTranslation('admin.users.deleteUser'),
      }),
    );
    await waitFor(() =>
      expect(mocks.csrf).toHaveBeenCalledWith(
        '/api/admin/users/user-1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });
});
