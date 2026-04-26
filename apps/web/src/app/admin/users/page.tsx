// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = 'force-dynamic';

import { validateAdminAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { logger } from '@/lib/logger';
import { UsersTable } from './users-table';

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: 'USER' | 'ADMIN';
  disabled: boolean;
  isTestData: boolean;
  createdAt: Date;
  subscription: {
    id: string;
    tier: {
      id: string;
      code: string;
      name: string;
      chatLimitDaily: number;
      voiceMinutesDaily: number;
      toolsLimitDaily: number;
      docsLimitTotal: number;
      features: unknown;
    };
    overrideLimits: unknown;
    overrideFeatures: unknown;
  } | null;
}

interface Tier {
  id: string;
  code: string;
  name: string;
}

export default async function AdminUsersPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect('/login');
  }

  let users: User[] = [];
  let tiers: Tier[] = [];
  let queryError: string | null = null;

  try {
    [users, tiers] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          disabled: true,
          isTestData: true,
          createdAt: true,
          subscription: {
            select: {
              id: true,
              tier: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  chatLimitDaily: true,
                  voiceMinutesDaily: true,
                  toolsLimitDaily: true,
                  docsLimitTotal: true,
                  features: true,
                },
              },
              overrideLimits: true,
              overrideFeatures: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }) as Promise<User[]>,
      prisma.tierDefinition.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: { sortOrder: 'asc' },
      }) as Promise<Tier[]>,
    ]);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('[admin/users] Failed to load users', undefined, err);
    queryError = err.message;
  }

  if (queryError) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          {/* eslint-disable-next-line local-rules/no-literal-strings-in-jsx -- Admin-only error fallback */}
          <h2 className="text-red-700 dark:text-red-300 font-semibold mb-2">
            Failed to load users
          </h2>
          <p className="text-red-600 dark:text-red-400 text-sm font-mono">{queryError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <UsersTable users={users} availableTiers={tiers} />
    </div>
  );
}
