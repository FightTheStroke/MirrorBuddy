'use client';

import { useState } from 'react';
import { TimelineView } from '@/components/education/knowledge-hub/views/timeline-view';
import type { KnowledgeHubMaterial } from '@/components/education/knowledge-hub/views';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function TimelinePage() {
  const handleSelectMaterial = (material: KnowledgeHubMaterial) => {
    console.log('Selected:', material);
  };

  return (
    <ToolLayout
      title="Linea Temporale"
      subtitle="Organizza eventi storici o sequenze in modo visivo"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      <TimelineView
        materials={[]}
        onSelectMaterial={handleSelectMaterial}
      />
    </ToolLayout>
  );
}
