'use client';

import { TimelineView } from '@/components/education/knowledge-hub/views/timeline-view';
import type { KnowledgeHubMaterial } from '@/components/education/knowledge-hub/views';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function TimelinePage() {
  const handleSelectMaterial = (_material: KnowledgeHubMaterial) => {
    // Handle material selection
  };

  return (
    <ToolLayout
      title="Linea Temporale"
      subtitle="Organizza eventi storici o sequenze in modo visivo"
      backRoute="/astuccio"
    >
      <TimelineView
        materials={[]}
        onSelectMaterial={handleSelectMaterial}
      />
    </ToolLayout>
  );
}
