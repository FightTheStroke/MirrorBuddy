import { exportListUser, projectListUser } from './user-list-projection';
import { MAX_USER_PAGE_SIZE, UserListQueryError } from './user-list-query';
import { userCollectionUrl, type UserCollectionPage } from './user-list-collection';
import type { ListedUser, UserListQuery } from './user-list-types';

async function collectUserPages<T>(
  query: UserListQuery,
  project: (user: ListedUser) => T,
  read: (url: string) => Promise<Response> = fetch,
) {
  if (query.tab === 'trash')
    throw new UserListQueryError('Trash cannot be collected as living users');
  const rows: T[] = [];
  const ids = new Set<string>();
  let cursor: string | null = null;
  let candidateCount: number | undefined;
  let processed = 0;
  for (;;) {
    const response = await read(userCollectionUrl(query, cursor, candidateCount, processed));
    if (!response.ok) throw new Error('User collection request failed');
    const data: UserCollectionPage = await response.json();
    const progress = data?.collection;
    if (
      !data ||
      !Array.isArray(data.users) ||
      !data.query ||
      !progress ||
      data.query.page !== 1 ||
      data.query.pageSize !== MAX_USER_PAGE_SIZE ||
      data.query.search !== query.search ||
      data.query.tab !== query.tab ||
      data.query.staging !== query.staging ||
      progress.cursor !== cursor ||
      !Number.isSafeInteger(progress.candidateCount) ||
      progress.candidateCount < 0 ||
      !Number.isSafeInteger(progress.scanned) ||
      progress.scanned < 0 ||
      progress.scanned > MAX_USER_PAGE_SIZE ||
      data.users.length > progress.scanned ||
      progress.processed !== processed + progress.scanned ||
      progress.processed > progress.candidateCount ||
      typeof progress.complete !== 'boolean' ||
      progress.complete !== (progress.processed === progress.candidateCount) ||
      (candidateCount !== undefined && candidateCount !== progress.candidateCount) ||
      (progress.complete
        ? progress.nextCursor !== null
        : typeof progress.nextCursor !== 'string' ||
          !progress.nextCursor ||
          progress.nextCursor === cursor ||
          progress.scanned === 0)
    )
      throw new Error('Invalid or incomplete user collection response');
    candidateCount = progress.candidateCount;
    processed = progress.processed;
    for (const input of data.users) {
      const user = projectListUser(input);
      if (ids.has(user.id)) throw new Error('User list changed during collection');
      ids.add(user.id);
      rows.push(project(user));
    }
    if (progress.complete) return rows;
    // A sparse candidate batch can contain no matches and still legitimately advance.
    cursor = progress.nextCursor;
  }
}

export function collectUserExport(query: UserListQuery, read?: (url: string) => Promise<Response>) {
  return collectUserPages(query, exportListUser, read);
}

export function collectUserSelection(
  query: UserListQuery,
  read?: (url: string) => Promise<Response>,
) {
  return collectUserPages(
    query,
    (user) => ({ id: user.id, username: user.username, email: user.email }),
    read,
  );
}
