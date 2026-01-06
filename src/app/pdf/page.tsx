'use client';

import { ToolLayout } from '@/components/tools/tool-layout';
import { ToolMaestroSelectionDialog } from '@/components/education/tool-maestro-selection-dialog';

export default function PdfPage() {
  return (
    <ToolLayout
      title="Carica PDF"
      subtitle="Carica un documento PDF e genera automaticamente materiali di studio"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      <div className="max-w-2xl mx-auto">
        <ToolMaestroSelectionDialog
          isOpen={true}
          toolType="pdf"
          onConfirm={() => {}}
          onClose={() => {}}
        />
      </div>
    </ToolLayout>
  );
}
