'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import { DiagramRenderer } from '@/components/tools/diagram-renderer';
import type { DiagramRequest } from '@/types/tools';

export default function DiagramPage() {
  const [request, setRequest] = useState<DiagramRequest | null>(null);

  const handleCreateDiagram = () => {
    const newDiagram: DiagramRequest = {
      type: 'flowchart',
      code: 'graph TD\n    A[Inizia] --> B[Elabora]\n    B --> C[Fine]',
      title: 'Nuovo Diagramma',
    };
    setRequest(newDiagram);
  };

  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        {request ? (
          <DiagramRenderer request={request} />
        ) : (
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Diagramma</h1>
            <button
              onClick={handleCreateDiagram}
              className="px-4 py-2 bg-primary text-white rounded-lg"
            >
              Crea nuovo diagramma
            </button>
          </div>
        )}
      </Suspense>
    </main>
  );
}
