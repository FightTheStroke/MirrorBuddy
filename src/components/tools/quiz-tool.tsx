'use client';

import { useMemo, useCallback } from 'react';
import { Quiz } from '@/components/education/quiz';
import { useProgressStore } from '@/lib/stores/app-store';
import toast from '@/components/ui/toast';
import type { QuizRequest, Quiz as QuizType, QuizResult } from '@/types';

interface QuizToolProps {
  request: QuizRequest;
  onComplete?: (result: QuizResult) => void;
}

export function QuizTool({ request, onComplete }: QuizToolProps) {
  const { addXP, updateMastery } = useProgressStore();

  // Convert request to Quiz format
  const quiz: QuizType = useMemo(() => ({
    id: crypto.randomUUID(),
    title: request.title,
    subject: request.subject,
    questions: request.questions.map((q, index) => ({
      id: `q-${index}`,
      text: q.text,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      hints: q.hints || [],
      explanation: q.explanation,
      difficulty: q.difficulty || 3,
      subject: request.subject,
      topic: q.topic || 'general',
    })),
    masteryThreshold: request.masteryThreshold ?? 70,
    xpReward: request.xpReward ?? 50,
  }), [request]);

  const handleComplete = useCallback((result: QuizResult) => {
    // Award XP
    if (result.xpEarned > 0) {
      addXP(result.xpEarned);

      // Show XP toast notification
      const scorePercent = Math.round(result.score);
      toast.success(
        `Quiz completato! +${result.xpEarned} XP`,
        `Punteggio: ${scorePercent}% - ${result.masteryAchieved ? 'Maestria raggiunta!' : 'Continua così!'}`,
        { duration: 5000 }
      );
    }

    // Update mastery based on score
    if (result.masteryAchieved) {
      updateMastery({
        subject: request.subject,
        percentage: Math.min(100, result.score),
        tier: result.score >= 90 ? 'expert' : result.score >= 70 ? 'advanced' : 'intermediate',
        topicsCompleted: 1,
        totalTopics: 1,
        lastStudied: new Date(),
      });
    }

    onComplete?.(result);
  }, [request.subject, addXP, updateMastery, onComplete]);

  const handleClose = useCallback(() => {
    // Just close without completing
  }, []);

  return (
    <div className="p-4">
      <Quiz
        quiz={quiz}
        onComplete={handleComplete}
        onClose={handleClose}
      />
    </div>
  );
}
