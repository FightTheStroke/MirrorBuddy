export const dynamic = 'force-dynamic';

import { validateAdminAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { logger } from '@/lib/logger';
import { getUserList } from '@/lib/admin/user-list-service';
import { projectListedTier } from '@/lib/admin/user-list-projection';
import type { UserSearchParams } from '@/lib/admin/user-list-types';
import { UsersTable } from './users-table';

export default async function AdminUsersPage({
  searchParams,
}: { searchParams?: Promise<UserSearchParams> } = {}) {
  // The listing carries usernames and email addresses of minors, so it is
  // restricted to a full administrator like the other ADMIN-only pages.
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) redirect('/login');
  const viewer = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  });
  if (!viewer || viewer.role !== 'ADMIN') redirect('/login');
  const t = await getTranslations('admin');

  try {
    const params = await searchParams;
    const [listing, tiers] = await Promise.all([
      getUserList(params),
      prisma.tierDefinition.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
    ]);
    return (
      <div className="max-w-6xl mx-auto">
        <UsersTable
          listing={listing}
          availableTiers={tiers.map(projectListedTier)}
          canManage={viewer.role === 'ADMIN'}
          stagingSpecified={params?.staging !== undefined}
        />
      </div>
    );
  } catch {
    logger.error('[admin/users] Failed to load bounded user listing');
    return (
      <div className="max-w-6xl mx-auto">
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <p className="text-red-700 dark:text-red-300">{t('users.pagination.loadFailed')}</p>
        </div>
      </div>
    );
  }
}
