'use client';

import { Suspense } from 'react';
import { DemoSandbox } from '@/components/tools/demo-sandbox';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function DemoPage() {
  return (
    <ToolLayout
      title="Demo Interattiva"
      subtitle="Esplora concetti STEM con simulazioni interattive"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <DemoSandbox data={{ title: 'Demo Interattiva', html: '<div class="p-8 text-center"><h2 class="text-2xl font-bold mb-4">Crea la tua Demo</h2><p>Seleziona un maestro per iniziare</p></div>' }} />
      </Suspense>
    </ToolLayout>
  );
}
