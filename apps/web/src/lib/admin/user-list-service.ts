import 'server-only';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import {
  parseUserListQuery,
  userListWhere,
  USER_LIST_ORDER,
  USER_TRASH_ORDER,
} from './user-list-query';
import { scanMatchingUsers, USER_SCAN_BATCH_SIZE } from './user-list-search';
import {
  ADMIN_USER_SELECT,
  ADMIN_TRASH_SELECT,
  projectListUser,
  projectDeletedUser,
} from './user-list-projection';
import type { UserListPage, UserListQuery, UserSearchParams } from './user-list-types';

async function livePage(tx: Prisma.TransactionClient, query: UserListQuery) {
  const where = userListWhere(query);
  if (query.search) {
    const match = await scanMatchingUsers(query, (after) =>
      tx.user.findMany({
        where,
        select: { id: true, username: true, email: true },
        orderBy: [...USER_LIST_ORDER],
        take: USER_SCAN_BATCH_SIZE,
        ...(after ? { cursor: { id: after }, skip: 1 } : {}),
      }),
    );
    const rows = match.ids.length
      ? await tx.user.findMany({
          where: { ...where, id: { in: match.ids } },
          select: ADMIN_USER_SELECT,
          orderBy: [...USER_LIST_ORDER],
          take: query.pageSize,
        })
      : [];
    return { users: rows.map(projectListUser), total: match.total, page: match.page };
  }
  const total = await tx.user.count({ where });
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const rows = await tx.user.findMany({
    where,
    select: ADMIN_USER_SELECT,
    orderBy: [...USER_LIST_ORDER],
    take: query.pageSize,
    skip: (page - 1) * query.pageSize,
  });
  return { users: rows.map(projectListUser), total, page };
}

async function trashPage(tx: Prisma.TransactionClient, query: UserListQuery) {
  if (query.search) {
    const match = await scanMatchingUsers(query, async (after) => {
      const rows = await tx.deletedUserBackup.findMany({
        select: { userId: true, username: true, email: true },
        orderBy: [...USER_TRASH_ORDER],
        take: USER_SCAN_BATCH_SIZE,
        ...(after ? { cursor: { userId: after }, skip: 1 } : {}),
      });
      return rows.map((row) => ({ id: row.userId, username: row.username, email: row.email }));
    });
    const rows = match.ids.length
      ? await tx.deletedUserBackup.findMany({
          where: { userId: { in: match.ids } },
          select: ADMIN_TRASH_SELECT,
          orderBy: [...USER_TRASH_ORDER],
          take: query.pageSize,
        })
      : [];
    return { backups: rows.map(projectDeletedUser), total: match.total, page: match.page };
  }
  const total = await tx.deletedUserBackup.count();
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const rows = await tx.deletedUserBackup.findMany({
    select: ADMIN_TRASH_SELECT,
    orderBy: [...USER_TRASH_ORDER],
    take: query.pageSize,
    skip: (page - 1) * query.pageSize,
  });
  return { backups: rows.map(projectDeletedUser), total, page };
}

export async function getUserList(
  input?: UserSearchParams | URLSearchParams | null,
): Promise<UserListPage> {
  const query = parseUserListQuery(input);
  // Count, ordered scans and selected-row projection share a stable database view.
  // Failures propagate to the page/API boundary; never manufacture an empty success.
  return prisma.$transaction(
    async (tx) => {
      const [totalUsers, stagingCount, trashTotal] = await Promise.all([
        tx.user.count({ where: query.staging ? {} : { isTestData: false } }),
        tx.user.count({ where: { isTestData: true } }),
        tx.deletedUserBackup.count(),
      ]);
      const result = query.tab === 'trash' ? await trashPage(tx, query) : await livePage(tx, query);
      return {
        query: { ...query, page: result.page },
        users: 'users' in result ? result.users : [],
        backups: 'backups' in result ? result.backups : [],
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / query.pageSize)),
        totalUsers,
        stagingCount,
        trashTotal,
      };
    },
    { isolationLevel: 'RepeatableRead', timeout: 30_000 },
  );
}
