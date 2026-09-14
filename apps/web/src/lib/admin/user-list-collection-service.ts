import 'server-only';
import { prisma } from '@/lib/db';
import { ADMIN_USER_SELECT, projectListUser } from './user-list-projection';
import { userListWhere, USER_LIST_ORDER } from './user-list-query';
import {
  collectionPage,
  parseUserCollection,
  UserCollectionChangedError,
} from './user-list-collection';

/** One capped candidate batch per request; PII decryption/auditing remains on the actual Prisma path. */
export async function getUserCollection(input: URLSearchParams) {
  const request = parseUserCollection(input);
  return prisma.$transaction(
    async (tx) => {
      const where = userListWhere(request.query);
      const count = await tx.user.count({ where });
      if (request.expectedCandidates !== null && request.expectedCandidates !== count) {
        throw new UserCollectionChangedError('User collection changed; retry');
      }
      if (request.cursor !== null) {
        const anchor = await tx.user.findFirst({
          where: { ...where, id: request.cursor },
          select: { id: true },
        });
        if (!anchor)
          throw new UserCollectionChangedError('User collection cursor is no longer available');
      }
      const rows = await tx.user.findMany({
        where,
        select: ADMIN_USER_SELECT,
        orderBy: [...USER_LIST_ORDER],
        take: request.query.pageSize,
        ...(request.cursor !== null ? { cursor: { id: request.cursor }, skip: 1 } : {}),
      });
      const last = rows[rows.length - 1];
      const hasMore = last
        ? !!(await tx.user.findFirst({
            where,
            orderBy: [...USER_LIST_ORDER],
            cursor: { id: last.id },
            skip: 1,
            select: { id: true },
          }))
        : false;
      return collectionPage(request, count, rows.map(projectListUser), hasMore);
    },
    { isolationLevel: 'RepeatableRead', timeout: 30_000 },
  );
}
