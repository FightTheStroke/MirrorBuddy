'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SummariesView } from '@/components/education/summaries-view';
import { ToolLayout } from '@/components/tools/tool-layout';

function SummaryPageContent() {
  const searchParams = useSearchParams();
  const maestroId = searchParams.get('maestroId');
  const mode = searchParams.get('mode') as 'voice' | 'chat' | null;

  return (
    <ToolLayout
      title="Riassunto"
      subtitle="Genera sintesi chiare e strutturate dei concetti chiave"
      backRoute="/astuccio"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <SummariesView initialMaestroId={maestroId} initialMode={mode} />
      </Suspense>
    </ToolLayout>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <SummaryPageContent />
    </Suspense>
  );
}
