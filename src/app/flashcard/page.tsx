'use client';

import { Suspense } from 'react';
import { FlashcardsView } from '@/components/education/flashcards-view';

export default function FlashcardPage() {
  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <FlashcardsView />
      </Suspense>
    </main>
  );
}
