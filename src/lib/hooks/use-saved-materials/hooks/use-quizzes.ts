/**
 * @file use-quizzes.ts
 * @brief Hook for quizzes
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserId } from '../utils/user-id';
import { fetchMaterials, saveMaterialToAPI, deleteMaterialFromAPI } from '../utils/api';
import type { SavedQuiz, QuizQuestion } from '../types';

export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<SavedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    const materials = await fetchMaterials('quiz', userId);
    const mapped: SavedQuiz[] = materials.map((m) => ({
      id: m.toolId,
      title: m.title,
      subject: m.subject || '',
      questions: (m.content as { questions?: QuizQuestion[] }).questions || [],
      createdAt: new Date(m.createdAt),
    }));
    setQuizzes(mapped);
    setLoading(false);
  }, [userId]);

  /* eslint-disable react-hooks/set-state-in-effect -- ADR 0015: Data loading pattern */
  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveQuiz = useCallback(
    async (quiz: { title: string; subject: string; questions: QuizQuestion[] }) => {
      const saved = await saveMaterialToAPI(
        userId,
        'quiz',
        quiz.title,
        { questions: quiz.questions },
        { subject: quiz.subject }
      );
      if (saved) {
        await loadQuizzes();
      }
      return saved;
    },
    [userId, loadQuizzes]
  );

  const deleteQuiz = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    }
    return success;
  }, []);

  return { quizzes, loading, saveQuiz, deleteQuiz, reload: loadQuizzes };
}

