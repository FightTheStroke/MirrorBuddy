import { validateAdminAuth } from '@/lib/auth/session-auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { UsersTable } from './users-table';

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: 'USER' | 'ADMIN';
  disabled: boolean;
  createdAt: Date;
}

export default async function AdminUsersPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect('/login');
  }

  const users: User[] = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      disabled: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600 mt-2">Manage users, roles, and access</p>
        </div>

        <UsersTable users={users} />
      </div>
    </div>
  );
}
