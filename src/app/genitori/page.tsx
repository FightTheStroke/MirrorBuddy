'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /genitori route alias - redirects to /parent-dashboard
 * This provides a more user-friendly Italian URL for parents.
 */
export default function GenitoriRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/parent-dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <p className="text-slate-500 dark:text-slate-400">Reindirizzamento...</p>
    </div>
  );
}
