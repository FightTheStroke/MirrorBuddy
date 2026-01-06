'use client';

import { useState } from 'react';
import { DiagramRenderer } from '@/components/tools/diagram-renderer';
import type { DiagramRequest } from '@/types/tools';
import { ToolLayout } from '@/components/tools/tool-layout';

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
    <ToolLayout
      title="Diagramma"
      subtitle="Crea diagrammi di flusso e schemi visivi"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      {request ? (
        <DiagramRenderer request={request} />
      ) : (
        <div className="flex items-center justify-center h-64">
          <button
            onClick={handleCreateDiagram}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Crea nuovo diagramma
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
