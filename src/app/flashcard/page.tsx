'use client';

import { Suspense } from 'react';
import { FlashcardsView } from '@/components/education/flashcards-view';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function FlashcardPage() {
  return (
    <ToolLayout
      title="Flashcard"
      subtitle="Memorizza con flashcard intelligenti e ripetizione spaziata"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <FlashcardsView />
      </Suspense>
    </ToolLayout>
  );
}
