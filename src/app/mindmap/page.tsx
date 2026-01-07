'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MindmapsView } from '@/components/education/mindmaps-view';
import { ToolLayout } from '@/components/tools/tool-layout';

function MindmapPageContent() {
  const searchParams = useSearchParams();
  const maestroId = searchParams.get('maestroId');
  const mode = searchParams.get('mode') as 'voice' | 'chat' | null;

  return (
    <ToolLayout
      title="Mappa Mentale"
      subtitle="Visualizza i collegamenti tra concetti con mappe interattive"
      backRoute="/astuccio"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <MindmapsView initialMaestroId={maestroId} initialMode={mode} />
      </Suspense>
    </ToolLayout>
  );
}

export default function MindmapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <MindmapPageContent />
    </Suspense>
  );
}
