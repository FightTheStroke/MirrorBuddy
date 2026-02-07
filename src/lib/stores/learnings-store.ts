// ============================================================================
// LEARNINGS STORE - Adaptive learning insights
// ============================================================================

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth';

// === TYPES ===

interface Learning {
  id: string;
  category: 'preference' | 'strength' | 'weakness' | 'interest' | 'style';
  insight: string;
  maestroId?: string;
  subject?: string;
  confidence: number;
  occurrences: number;
  createdAt: Date;
  updatedAt: Date;
}

// === STORE ===

interface LearningsState {
  learnings: Learning[];
  lastSyncedAt: Date | null;
  // Actions
  addLearning: (learning: Omit<Learning, 'id' | 'occurrences' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeLearning: (id: string) => Promise<void>;
  getLearningsByCategory: (category: Learning['category']) => Learning[];
  // Sync
  loadFromServer: () => Promise<void>;
}

export const useLearningsStore = create<LearningsState>()(
  (set, get) => ({
      learnings: [],
      lastSyncedAt: null,

      addLearning: async (learning) => {
        try {
          const response = await csrfFetch('/api/learnings', {
            method: 'POST',
            body: JSON.stringify(learning),
          });

          if (response.ok) {
            const serverLearning = await response.json();
            set((state) => {
              // Check if this was a reinforcement
              if (serverLearning.reinforced) {
                return {
                  learnings: state.learnings.map((l) =>
                    l.id === serverLearning.id
                      ? { ...l, confidence: serverLearning.confidence, occurrences: serverLearning.occurrences }
                      : l
                  ),
                };
              }
              // New learning
              return {
                learnings: [
                  {
                    ...serverLearning,
                    createdAt: new Date(serverLearning.createdAt),
                    updatedAt: new Date(serverLearning.updatedAt),
                  },
                  ...state.learnings,
                ],
              };
            });
          }
        } catch (error) {
          logger.error('Failed to add learning', { error: String(error) });
        }
      },

      removeLearning: async (id) => {
        set((state) => ({
          learnings: state.learnings.filter((l) => l.id !== id),
        }));

        try {
          await csrfFetch(`/api/learnings?id=${id}`, { method: 'DELETE' });
        } catch (error) {
          logger.error('Failed to remove learning', { error: String(error) });
        }
      },

      getLearningsByCategory: (category) => {
        return get().learnings.filter((l) => l.category === category);
      },

      loadFromServer: async () => {
        try {
          const response = await fetch('/api/learnings');
          if (response.ok) {
            const data = await response.json();
            // API returns { learnings: [...], pagination: {...} }
            const learnings = data.learnings || [];
            set({
              learnings: learnings.map((l: Learning & { createdAt: string; updatedAt: string }) => ({
                ...l,
                createdAt: new Date(l.createdAt),
                updatedAt: new Date(l.updatedAt),
              })),
              lastSyncedAt: new Date(),
            });
          }
        } catch (error) {
          logger.error('Learnings load failed', { error: String(error) });
        }
      },
    })
);
