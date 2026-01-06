'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import { ChartRenderer } from '@/components/tools/chart-renderer';
import type { ChartRequest } from '@/types/tools';

export default function ChartPage() {
  const [request, setRequest] = useState<ChartRequest | null>(null);

  const handleCreateChart = () => {
    setRequest({
      type: 'bar',
      title: 'Nuovo Grafico',
      data: { labels: [], datasets: [] },
    });
  };

  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        {request ? (
          <ChartRenderer request={request} />
        ) : (
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Grafico</h1>
            <button
              onClick={handleCreateChart}
              className="px-4 py-2 bg-primary text-white rounded-lg"
            >
              Crea nuovo grafico
            </button>
          </div>
        )}
      </Suspense>
    </main>
  );
}
