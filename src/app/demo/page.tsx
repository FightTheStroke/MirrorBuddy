'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import { DemoSandbox } from '@/components/tools/demo-sandbox';

export default function DemoPage() {
  const [demoData, setDemoData] = useState<{
    title?: string;
    html: string;
    css?: string;
    js?: string;
  } | null>(null);

  const handleCreateDemo = () => {
    setDemoData({
      title: 'Demo Interattiva',
      html: '<div class="p-8 text-center"><h2 class="text-2xl font-bold mb-4">Crea la tua Demo</h2><p>Seleziona un maestro per iniziare</p></div>',
      css: '',
      js: '',
    });
  };

  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        {demoData ? (
          <DemoSandbox data={demoData} />
        ) : (
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Demo Interattiva</h1>
            <button
              onClick={handleCreateDemo}
              className="px-4 py-2 bg-primary text-white rounded-lg"
            >
              Crea nuova demo
            </button>
          </div>
        )}
      </Suspense>
    </main>
  );
}
