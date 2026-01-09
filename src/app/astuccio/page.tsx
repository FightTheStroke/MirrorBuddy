'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AstuccioPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?view=astuccio');
  }, [router]);

  return (
    <main className="h-full flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </main>
  );
}
