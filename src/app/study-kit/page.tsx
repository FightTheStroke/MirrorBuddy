'use client';

/**
 * Study Kit Generator Page - DEPRECATED
 * Redirects to /astuccio (school metaphor)
 * Route: /study-kit
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudyKitPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?view=astuccio');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
