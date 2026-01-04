'use client';

/**
 * Zaino Page (Backpack - School Metaphor)
 * Redesigned with faceted filtering, no hierarchical navigation
 * Route: /zaino
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ZainoView } from './components/zaino-view';

function ZainoContent() {
  const searchParams = useSearchParams();

  // Extract filter params from URL
  const type = searchParams.get('type') || undefined;
  const subject = searchParams.get('subject') || undefined;
  const maestro = searchParams.get('maestro') || undefined;

  return (
    <ZainoView
      initialType={type}
      initialSubject={subject}
      initialMaestro={maestro}
    />
  );
}

export default function ZainoPage() {
  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <ZainoContent />
      </Suspense>
    </main>
  );
}
