'use client';

import { Suspense } from 'react';
import { SummariesView } from '@/components/education/summaries-view';

export default function SummaryPage() {
  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <SummariesView />
      </Suspense>
    </main>
  );
}
