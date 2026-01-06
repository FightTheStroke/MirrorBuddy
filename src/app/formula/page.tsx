'use client';

import { useState } from 'react';
import { FormulaRenderer } from '@/components/tools/formula-renderer';
import type { FormulaRequest } from '@/types/tools';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function FormulaPage() {
  const [request, setRequest] = useState<FormulaRequest | null>(null);

  const handleCreateFormula = () => {
    const newFormula: FormulaRequest = {
      latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      description: 'Formula quadratica',
    };
    setRequest(newFormula);
  };

  return (
    <ToolLayout
      title="Formula"
      subtitle="Visualizza e comprendi formule matematiche e scientifiche"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      {request ? (
        <FormulaRenderer request={request} />
      ) : (
        <div className="flex items-center justify-center h-64">
          <button
            onClick={handleCreateFormula}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Crea nuova formula
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
