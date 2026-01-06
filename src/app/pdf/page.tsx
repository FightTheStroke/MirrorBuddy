'use client';

import { Suspense } from 'react';
import { ToolMaestroSelectionDialog } from '@/components/education/tool-maestro-selection-dialog';
import type { ToolType } from '@/types/tools';

export default function PdfPage() {
  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Carica PDF</h1>
          <ToolMaestroSelectionDialog
            isOpen={true}
            toolType="pdf"
            onConfirm={() => {}}
            onClose={() => {}}
          />
        </div>
      </Suspense>
    </main>
  );
}
