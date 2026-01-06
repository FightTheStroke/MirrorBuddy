/**
 * @file use-homework-sessions.ts
 * @brief Hook for homework sessions
 */

import { useState, useEffect, useCallback } from 'react';
import type { Subject } from '@/types';
import { getUserId } from '../utils/user-id';
import {
  fetchMaterials,
  saveMaterialToAPI,
  deleteMaterialFromAPI,
  updateMaterialInAPI,
} from '../utils/api';
import type { SavedHomework, HomeworkStep } from '../types';

export function useHomeworkSessions() {
  const [sessions, setSessions] = useState<SavedHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const materials = await fetchMaterials('homework', userId);
    const mapped: SavedHomework[] = materials.map((m) => {
      const content = m.content as {
        steps?: HomeworkStep[];
        problemType?: string;
        photoUrl?: string;
        completedAt?: string;
      };
      return {
        id: m.toolId,
        title: m.title,
        subject: (m.subject || 'mathematics') as Subject,
        problemType: content.problemType || 'Esercizio',
        photoUrl: content.photoUrl,
        steps: content.steps || [],
        createdAt: new Date(m.createdAt),
        completedAt: content.completedAt ? new Date(content.completedAt) : undefined,
      };
    });
    setSessions(mapped);
    setLoading(false);
  }, [userId]);

  /* eslint-disable react-hooks/set-state-in-effect -- ADR 0015: Data loading pattern */
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveSession = useCallback(
    async (homework: Omit<SavedHomework, 'id' | 'createdAt'>) => {
      const saved = await saveMaterialToAPI(
        userId,
        'homework',
        homework.title,
        {
          steps: homework.steps,
          problemType: homework.problemType,
          photoUrl: homework.photoUrl,
          completedAt: homework.completedAt?.toISOString(),
        },
        { subject: homework.subject }
      );
      if (saved) {
        await loadSessions();
      }
      return saved;
    },
    [userId, loadSessions]
  );

  const updateSession = useCallback(async (homework: SavedHomework) => {
    const success = await updateMaterialInAPI(
      homework.id,
      {
        steps: homework.steps,
        problemType: homework.problemType,
        photoUrl: homework.photoUrl,
        completedAt: homework.completedAt?.toISOString(),
      },
      homework.title
    );
    if (success) {
      setSessions((prev) =>
        prev.map((s) => (s.id === homework.id ? homework : s))
      );
    }
    return success;
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
    return success;
  }, []);

  return {
    sessions,
    loading,
    saveSession,
    updateSession,
    deleteSession,
    reload: loadSessions,
  };
}

