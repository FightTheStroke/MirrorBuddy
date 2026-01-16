'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { Quiz } from '@/components/education/quiz';
import { useProgressStore } from '@/lib/stores';
import toast from '@/components/ui/toast';
import type { Question, QuizRequest, Quiz as QuizType, QuizResult } from '@/types';

interface QuizToolProps {
  request: QuizRequest;
  onComplete?: (result: QuizResult) => void;
}

export function QuizTool({ request, onComplete }: QuizToolProps) {
  const { addXP, updateMastery } = useProgressStore();
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState<number | null>(null);

  const normalizeDifficulty = useCallback((value?: number): Question['difficulty'] => {
    const rounded = Math.round(value ?? 3);
    return Math.min(5, Math.max(1, rounded)) as Question['difficulty'];
  }, []);

  useEffect(() => {
    let isActive = true;
    const params = new URLSearchParams();
    params.set('subject', request.subject);
    params.set('source', 'quiz');
    fetch(`/api/adaptive/context?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isActive) return;
        const target = data?.context?.targetDifficulty;
        if (typeof target === 'number') {
          setAdaptiveDifficulty(target);
        }
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, [request.subject]);

  // Convert request to Quiz format
  const quiz: QuizType = useMemo(() => ({
    id: crypto.randomUUID(),
    title: request.title,
    subject: request.subject,
    questions: request.questions.map((q, index) => {
      const legacy = q as Partial<{
        question: string;
        correctIndex: number;
        options: string[];
        explanation: string;
      }>;
      const fallbackDifficulty = normalizeDifficulty(adaptiveDifficulty ?? request.difficulty ?? 3);
      return {
        id: `q-${index}`,
        text: q.text || legacy.question || '',
        type: q.type || 'multiple_choice',
        options: q.options || legacy.options,
        correctAnswer: q.correctAnswer ?? legacy.correctIndex ?? 0,
        hints: q.hints || [],
        explanation: q.explanation || legacy.explanation || '',
        difficulty: q.difficulty ?? fallbackDifficulty,
        subject: request.subject,
        topic: q.topic || request.title,
      };
    }),
    masteryThreshold: request.masteryThreshold ?? 70,
    xpReward: request.xpReward ?? 50,
  }), [request, adaptiveDifficulty, normalizeDifficulty]);

  const handleComplete = useCallback((result: QuizResult) => {
    const avgDifficulty =
      quiz.questions.reduce((sum, q) => sum + (q.difficulty || 3), 0) / quiz.questions.length;

    fetch('/api/quizzes/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId: result.quizId,
        score: result.correctAnswers,
        totalQuestions: result.totalQuestions,
        subject: request.subject,
        topic: request.title,
        avgDifficulty,
        source: 'quiz',
      }),
    }).catch(() => undefined);

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
  }, [quiz.questions, request.subject, request.title, addXP, updateMastery, onComplete]);

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
