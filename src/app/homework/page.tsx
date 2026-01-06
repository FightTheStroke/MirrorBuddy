'use client';

import { Suspense } from 'react';
import { HomeworkHelpView } from '@/components/education/homework-help-view';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function HomeworkPage() {
  return (
    <ToolLayout
      title="Aiuto Compiti"
      subtitle="Carica un esercizio e ricevi assistenza guidata passo-passo"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <HomeworkHelpView />
      </Suspense>
    </ToolLayout>
  );
}
