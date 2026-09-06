import type { Prisma } from '@prisma/client';
import type { UserListQuery, UserSearchParams } from './user-list-types';
export {
  ADMIN_USER_SELECT,
  ADMIN_TRASH_SELECT,
  projectListUser,
  exportListUser,
} from './user-list-projection';
export { scanMatchingUsers, USER_SCAN_BATCH_SIZE } from './user-list-search';

export const USER_PAGE_SIZE = 25;
export const MAX_USER_PAGE_SIZE = 100;
export const USER_LIST_ORDER = [{ createdAt: 'desc' }, { id: 'desc' }] as const;
export const USER_TRASH_ORDER = [{ deletedAt: 'desc' }, { userId: 'desc' }] as const;

export class UserListQueryError extends Error {}

export function parseUserListQuery(
  input?: UserSearchParams | URLSearchParams | null,
): UserListQuery {
  const get = (key: string): string | undefined => {
    const value =
      input instanceof URLSearchParams
        ? input.getAll(key).length > 1
          ? input.getAll(key)
          : (input.get(key) ?? undefined)
        : input?.[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string')
      throw new UserListQueryError('Duplicate or invalid query parameter');
    return value;
  };
  const integer = (key: string, fallback: number) => {
    const value = get(key);
    if (value === undefined) return fallback;
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new UserListQueryError('Invalid pagination');
    }
    return Number(value);
  };
  const page = integer('page', 1);
  const pageSize = Math.min(integer('pageSize', USER_PAGE_SIZE), MAX_USER_PAGE_SIZE);
  if (page > Math.floor(2_147_483_647 / pageSize))
    throw new UserListQueryError('Page exceeds supported range');
  const tab = get('tab') ?? 'all';
  if (tab !== 'all' && tab !== 'active' && tab !== 'disabled' && tab !== 'trash') {
    throw new UserListQueryError('Invalid user filter');
  }
  const search = (get('search') ?? '').trim();
  if (search.length > 200) throw new UserListQueryError('Search is too long');
  const staging = get('staging') ?? 'false';
  if (staging !== 'true' && staging !== 'false')
    throw new UserListQueryError('Invalid staging filter');
  return { page, pageSize, tab, search, staging: staging === 'true' };
}

export function userListWhere(query: UserListQuery): Prisma.UserWhereInput {
  return {
    ...(query.tab === 'active'
      ? { disabled: false }
      : query.tab === 'disabled'
        ? { disabled: true }
        : {}),
    ...(!query.staging ? { isTestData: false } : {}),
  };
}

export function userListUrl(query: UserListQuery, base = '/admin/users'): string {
  const params = new URLSearchParams({
    tab: query.tab,
    page: String(query.page),
    pageSize: String(query.pageSize),
    staging: String(query.staging),
  });
  if (query.search) params.set('search', query.search);
  return `${base}?${params.toString()}`;
}
