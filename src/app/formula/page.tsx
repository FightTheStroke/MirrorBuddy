'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import { FormulaRenderer } from '@/components/tools/formula-renderer';
import type { FormulaRequest } from '@/types/tools';

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
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        {request ? (
          <FormulaRenderer request={request} />
        ) : (
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Formula</h1>
            <button
              onClick={handleCreateFormula}
              className="px-4 py-2 bg-primary text-white rounded-lg"
            >
              Crea nuova formula
            </button>
          </div>
        )}
      </Suspense>
    </main>
  );
}
