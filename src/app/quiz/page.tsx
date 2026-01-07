'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QuizView } from '@/components/education/quiz-view';
import { ToolLayout } from '@/components/tools/tool-layout';

function QuizPageContent() {
  const searchParams = useSearchParams();
  const maestroId = searchParams.get('maestroId');
  const mode = searchParams.get('mode') as 'voice' | 'chat' | null;

  return (
    <ToolLayout
      title="Quiz"
      subtitle="Verifica la tua comprensione con quiz personalizzati"
      backRoute="/astuccio"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <QuizView initialMaestroId={maestroId} initialMode={mode} />
      </Suspense>
    </ToolLayout>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <QuizPageContent />
    </Suspense>
  );
}
