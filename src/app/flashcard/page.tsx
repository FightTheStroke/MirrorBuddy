'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FlashcardsView } from '@/components/education/flashcards-view';
import { ToolLayout } from '@/components/tools/tool-layout';

function FlashcardPageContent() {
  const searchParams = useSearchParams();
  const maestroId = searchParams.get('maestroId');
  const mode = searchParams.get('mode') as 'voice' | 'chat' | null;

  return (
    <ToolLayout
      title="Flashcard"
      subtitle="Memorizza con flashcard intelligenti e ripetizione spaziata"
      backRoute="/astuccio"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <FlashcardsView initialMaestroId={maestroId} initialMode={mode} />
      </Suspense>
    </ToolLayout>
  );
}

export default function FlashcardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <FlashcardPageContent />
    </Suspense>
  );
}
