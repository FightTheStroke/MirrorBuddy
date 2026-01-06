'use client';

import { Suspense } from 'react';
import { MindmapsView } from '@/components/education/mindmaps-view';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function MindmapPage() {
  return (
    <ToolLayout
      title="Mappa Mentale"
      subtitle="Visualizza i collegamenti tra concetti con mappe interattive"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <MindmapsView />
      </Suspense>
    </ToolLayout>
  );
}
