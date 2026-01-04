'use client';

/**
 * Astuccio Page (Pencil Case - School Metaphor)
 * Replaces "Study Kit" with creative tools hub
 * Route: /astuccio
 */

import { Suspense } from 'react';
import { AstuccioView } from './components/astuccio-view';

export default function AstuccioPage() {
  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <AstuccioView />
      </Suspense>
    </main>
  );
}
