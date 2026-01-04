'use client';

/**
 * Supporti Page (Wave 4) - DEPRECATED
 * Redirects to /zaino (school metaphor)
 * Route: /supporti
 */

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SupportiRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve query parameters
    const queryString = searchParams.toString();
    const destination = queryString ? `/zaino?${queryString}` : '/zaino';
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

export default function SupportiPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <SupportiRedirect />
    </Suspense>
  );
}
