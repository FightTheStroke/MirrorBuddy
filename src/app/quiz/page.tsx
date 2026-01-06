'use client';

import { Suspense } from 'react';
import { QuizView } from '@/components/education/quiz-view';
import { ToolLayout } from '@/components/tools/tool-layout';

export default function QuizPage() {
  return (
    <ToolLayout
      title="Quiz"
      subtitle="Verifica la tua comprensione con quiz personalizzati"
      backRoute="/astuccio"
      backLabel="Torna all'Astuccio"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <QuizView />
      </Suspense>
    </ToolLayout>
  );
}
