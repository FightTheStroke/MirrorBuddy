'use client';

import { Suspense } from 'react';
import { SummariesView } from '@/components/education/summaries-view';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function SummaryPage() {
  return (
    <ToolLayout
      title="Riassunto"
      subtitle="Genera sintesi chiare e strutturate dei concetti chiave"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <SummariesView />
      </Suspense>
    </ToolLayout>
  );
}
