// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = 'force-dynamic';

import { validateAdminAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { WaitlistAdminClient } from './waitlist-admin-client';

export default async function AdminWaitlistPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect('/login');
  }

  return (
    <div className="max-w-7xl mx-auto">
      <WaitlistAdminClient />
    </div>
  );
}
