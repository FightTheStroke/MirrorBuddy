import type { UserListQuery } from './user-list-types';

export const USER_SCAN_BATCH_SIZE = 100;
export interface UserSearchCandidate {
  id: string;
  username: string | null;
  email: string | null;
}

export function matchesUserSearch(
  user: Pick<UserSearchCandidate, 'username' | 'email'>,
  search: string,
): boolean {
  const term = search.toLowerCase();
  return (
    !term ||
    !!user.username?.toLowerCase().includes(term) ||
    !!user.email?.toLowerCase().includes(term)
  );
}

/** Email is encrypted at rest: filter the server-decrypted projection in capped, ordered batches. */
export async function scanMatchingUsers(
  query: UserListQuery,
  fetchBatch: (after?: string) => Promise<readonly UserSearchCandidate[] | null | undefined>,
): Promise<{ ids: string[]; total: number; page: number }> {
  let after: string | undefined;
  let total = 0;
  let lastPage: string[] = [];
  const requested: string[] = [];
  for (;;) {
    const batch = await fetchBatch(after);
    if (!Array.isArray(batch) || batch.length > USER_SCAN_BATCH_SIZE)
      throw new Error('Invalid user search batch');
    const seen = new Set<string>();
    for (const row of batch) {
      if (!row || typeof row.id !== 'string' || !row.id || seen.has(row.id) || row.id === after) {
        throw new Error('User search cursor did not advance');
      }
      seen.add(row.id);
      if (
        (row.username !== null && typeof row.username !== 'string') ||
        (row.email !== null && typeof row.email !== 'string')
      )
        throw new Error('Invalid user search identity');
      if (!matchesUserSearch(row, query.search)) continue;
      if (total % query.pageSize === 0) lastPage = [];
      lastPage.push(row.id);
      const matchPage = Math.floor(total / query.pageSize) + 1;
      if (matchPage === query.page) requested.push(row.id);
      total++;
    }
    if (batch.length < USER_SCAN_BATCH_SIZE) break;
    after = batch[batch.length - 1].id;
  }
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  return { ids: page === query.page ? requested : lastPage, total, page };
}
