'use client';

import { Suspense } from 'react';
import { TimelineView } from '@/components/education/knowledge-hub/views/timeline-view';
import type { KnowledgeHubMaterial } from '@/components/education/knowledge-hub/views';

export default function TimelinePage() {
  const handleSelectMaterial = (material: KnowledgeHubMaterial) => {
    console.log('Selected:', material);
  };

  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <TimelineView
          materials={[]}
          onSelectMaterial={handleSelectMaterial}
        />
      </Suspense>
    </main>
  );
}
