'use client';

import { Suspense } from 'react';
import { QuizView } from '@/components/education/quiz-view';

export default function QuizPage() {
  return (
    <main className="h-full">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <QuizView />
      </Suspense>
    </main>
  );
}
