import {
  MAX_USER_PAGE_SIZE,
  parseUserListQuery,
  userListUrl,
  UserListQueryError,
} from './user-list-query';
import { matchesUserSearch } from './user-list-search';
import type { ListedUser, UserListQuery } from './user-list-types';

export interface UserCollectionRequest {
  query: UserListQuery;
  cursor: string | null;
  expectedCandidates: number | null;
  processed: number;
}
export interface UserCollectionPage {
  query: UserListQuery;
  users: ListedUser[];
  collection: {
    cursor: string | null;
    nextCursor: string | null;
    candidateCount: number;
    scanned: number;
    processed: number;
    complete: boolean;
  };
}
export class UserCollectionChangedError extends Error {}

export function parseUserCollection(
  input: URLSearchParams | null | undefined,
): UserCollectionRequest {
  if (!(input instanceof URLSearchParams))
    throw new UserListQueryError('Collection parameters are required');
  const value = (key: string) => {
    if (input.getAll(key).length > 1)
      throw new UserListQueryError('Duplicate collection parameter');
    return input.get(key);
  };
  const query = parseUserListQuery(input);
  if (value('collection') !== 'cursor' || query.tab === 'trash' || query.page !== 1) {
    throw new UserListQueryError('Invalid user collection mode');
  }
  const cursor = value('cursor');
  if (cursor !== null && (!cursor || cursor.length > 1024))
    throw new UserListQueryError('Invalid collection cursor');
  const integer = (key: string) => {
    const raw = value(key);
    if (raw === null) return null;
    if (!/^(0|[1-9]\d*)$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
      throw new UserListQueryError('Invalid collection progress');
    }
    return Number(raw);
  };
  const expectedCandidates = integer('candidates');
  const processed = integer('processed');
  if (
    cursor === null
      ? expectedCandidates !== null || processed !== null
      : expectedCandidates === null ||
        processed === null ||
        processed < 1 ||
        processed > expectedCandidates
  ) {
    throw new UserListQueryError('Incomplete collection continuation');
  }
  return { query, cursor, expectedCandidates, processed: processed ?? 0 };
}

export function collectionPage(
  request: UserCollectionRequest,
  candidateCount: number,
  candidates: ListedUser[],
  hasMore: boolean,
): UserCollectionPage {
  if (
    !Number.isSafeInteger(candidateCount) ||
    candidateCount < 0 ||
    (request.expectedCandidates !== null && request.expectedCandidates !== candidateCount) ||
    candidates.length > request.query.pageSize
  )
    throw new UserCollectionChangedError('User collection changed');
  const processed = request.processed + candidates.length;
  const complete = !hasMore;
  if (
    processed > candidateCount ||
    (complete && processed !== candidateCount) ||
    (!complete && (processed >= candidateCount || candidates.length < request.query.pageSize))
  ) {
    throw new UserCollectionChangedError('User collection is incomplete');
  }
  const nextCursor = complete ? null : candidates[candidates.length - 1]?.id;
  if (!complete && (!nextCursor || nextCursor === request.cursor))
    throw new UserCollectionChangedError('Collection did not advance');
  return {
    query: request.query,
    users: candidates.filter((user) => matchesUserSearch(user, request.query.search)),
    collection: {
      cursor: request.cursor,
      nextCursor: nextCursor ?? null,
      candidateCount,
      scanned: candidates.length,
      processed,
      complete,
    },
  };
}

export function userCollectionUrl(
  query: UserListQuery,
  cursor: string | null,
  candidateCount: number | undefined,
  processed: number,
): string {
  if (query.tab === 'trash')
    throw new UserListQueryError('Trash cannot be collected as living users');
  const url = new URL(
    userListUrl({ ...query, page: 1, pageSize: MAX_USER_PAGE_SIZE }, '/api/admin/users'),
    'http://localhost',
  );
  url.searchParams.set('collection', 'cursor');
  if (cursor !== null) {
    url.searchParams.set('cursor', cursor);
    url.searchParams.set('candidates', String(candidateCount));
    url.searchParams.set('processed', String(processed));
  }
  return url.pathname + url.search;
}
