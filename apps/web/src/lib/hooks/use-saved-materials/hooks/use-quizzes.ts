/**
 * @file use-quizzes.ts
 * @brief Hook for quizzes
 */

import { useState, useEffect, useCallback } from 'react';
import { isCurrentOwner, useMaterialOwner } from '../utils/use-material-owner';
import { fetchMaterials, saveMaterialToAPI, deleteMaterialFromAPI } from '../utils/api';
import type { SavedQuiz, QuizQuestion } from '../types';

export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<SavedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId, identity, identityError } = useMaterialOwner();
  const [error, setError] = useState<string | null>(null);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const materials = await fetchMaterials('quiz', userId);
      if (!isCurrentOwner(identity)) return;
      const mapped: SavedQuiz[] = materials.map((m) => ({
        id: m.toolId,
        title: m.title,
        subject: m.subject || '',
        questions: (m.content as { questions?: QuizQuestion[] }).questions || [],
        createdAt: new Date(m.createdAt),
      }));
      setQuizzes(mapped);
      setLoadedOwner(userId);
      setError(null);
    } catch {
      if (isCurrentOwner(identity)) setError('MATERIALS_UNAVAILABLE');
    } finally {
      if (isCurrentOwner(identity)) setLoading(false);
    }
  }, [userId, identity]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const saveQuiz = useCallback(
    async (quiz: { title: string; subject: string; questions: QuizQuestion[] }) => {
      const saved = await saveMaterialToAPI(
        userId,
        'quiz',
        quiz.title,
        { questions: quiz.questions },
        { subject: quiz.subject },
      );
      if (saved) {
        await loadQuizzes();
      }
      return saved;
    },
    [userId, loadQuizzes],
  );

  const deleteQuiz = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    }
    return success;
  }, []);

  return {
    quizzes: userId && loadedOwner === userId ? quizzes : [],
    loading,
    error: identityError || error,
    saveQuiz,
    deleteQuiz,
    reload: loadQuizzes,
  };
}
