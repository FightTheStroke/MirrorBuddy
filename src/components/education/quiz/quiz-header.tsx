'use client';

import { Progress } from '@/components/ui/progress';

interface QuizHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  correctCount: number;
  progress: number;
}

export function QuizHeader({
  currentIndex,
  totalQuestions,
  correctCount,
  progress,
}: QuizHeaderProps) {
  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-500">
          Domanda {currentIndex + 1} di {totalQuestions}
        </span>
        <span className="text-sm font-medium text-blue-600">
          {correctCount} corrette
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
