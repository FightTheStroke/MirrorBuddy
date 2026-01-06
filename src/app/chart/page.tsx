'use client';

import { useState } from 'react';
import { ChartRenderer } from '@/components/tools/chart-renderer';
import type { ChartRequest } from '@/types/tools';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function ChartPage() {
  const [request, setRequest] = useState<ChartRequest | null>(null);

  const handleCreateChart = () => {
    const newChart: ChartRequest = {
      type: 'bar',
      title: 'Nuovo Grafico',
      data: { labels: [], datasets: [] },
    };
    setRequest(newChart);
  };

  return (
    <ToolLayout
      title="Grafico"
      subtitle="Crea grafici e visualizzazioni per dati e statistiche"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      {request ? (
        <ChartRenderer request={request} />
      ) : (
        <div className="flex items-center justify-center h-64">
          <button
            onClick={handleCreateChart}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Crea nuovo grafico
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
