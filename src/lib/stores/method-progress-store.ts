/**
 * Method Progress Store - Zustand store for autonomy tracking
 * Tracks HOW students learn, not just WHAT they learn
 * Issue #28
 */

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import type {
  MethodProgress,
  MethodEvent,
  MindMapProgress,
  FlashcardProgress,
  SelfAssessmentProgress,
  HelpBehavior,
  MethodTransfer,
  SkillLevel,
  ToolType,
  HelpLevel,
  Subject,
} from '@/lib/method-progress/types';
import { DEFAULT_METHOD_PROGRESS, LEVEL_THRESHOLDS } from '@/lib/method-progress/types';

interface MethodProgressState extends Omit<MethodProgress, 'userId'> {
  userId: string | null;
  isLoading: boolean;
  lastSyncedAt: Date | null;

  // Actions
  setUserId: (userId: string) => void;
  fetchProgress: () => Promise<void>;
  syncToServer: () => Promise<void>;

  // Recording events
  recordToolCreation: (tool: ToolType, helpLevel: HelpLevel, subject?: Subject, qualityScore?: number) => void;
  recordSelfCorrection: (context: string, subject?: Subject) => void;
  recordHelpRequest: (context: string, timeElapsedSeconds: number, subject?: Subject) => void;
  recordProblemSolvedAlone: (context: string, subject?: Subject) => void;
  recordMethodTransfer: (fromSubject: Subject, toSubject: Subject, method: ToolType) => void;

  // Utilities
  getSkillLevel: (progress: number) => SkillLevel;
  reset: () => void;
}

// Calculate skill level from progress percentage
function calculateLevel(progress: number): SkillLevel {
  if (progress >= LEVEL_THRESHOLDS.expert) return 'expert';
  if (progress >= LEVEL_THRESHOLDS.competent) return 'competent';
  if (progress >= LEVEL_THRESHOLDS.learning) return 'learning';
  return 'novice';
}

// Calculate autonomy score from all metrics
function calculateAutonomyScore(state: {
  mindMaps: MindMapProgress;
  flashcards: FlashcardProgress;
  selfAssessment: SelfAssessmentProgress;
  helpBehavior: HelpBehavior;
  methodTransfer: MethodTransfer;
}): number {
  const { mindMaps, flashcards, helpBehavior, methodTransfer } = state;

  // Weight different factors
  const aloneRatio = helpBehavior.solvedAlone / Math.max(1, helpBehavior.questionsAsked + helpBehavior.solvedAlone);
  const selfCorrectionRatio = helpBehavior.selfCorrections / Math.max(1, helpBehavior.questionsAsked);
  const toolsAloneRatio = (mindMaps.createdAlone + flashcards.createdAlone) /
    Math.max(1, mindMaps.createdAlone + mindMaps.createdWithHints + mindMaps.createdWithFullHelp +
      flashcards.createdAlone + flashcards.createdWithHints);
  const transferBonus = Math.min(1, methodTransfer.subjectsApplied.length / 5);

  // Weighted average
  return (aloneRatio * 0.3 + selfCorrectionRatio * 0.2 + toolsAloneRatio * 0.3 + transferBonus * 0.2);
}

export const useMethodProgressStore = create<MethodProgressState>()(
  (set, get) => ({
      ...DEFAULT_METHOD_PROGRESS,
      userId: null,
      isLoading: false,
      lastSyncedAt: null,

      setUserId: (userId) => {
        set({ userId });
        get().fetchProgress();
      },

      fetchProgress: async () => {
        const { userId } = get();
        if (!userId) return;

        set({ isLoading: true });
        try {
          const response = await fetch(`/api/progress/autonomy?userId=${userId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              set({
                mindMaps: data.data.mindMaps || DEFAULT_METHOD_PROGRESS.mindMaps,
                flashcards: data.data.flashcards || DEFAULT_METHOD_PROGRESS.flashcards,
                selfAssessment: data.data.selfAssessment || DEFAULT_METHOD_PROGRESS.selfAssessment,
                helpBehavior: data.data.helpBehavior || DEFAULT_METHOD_PROGRESS.helpBehavior,
                methodTransfer: data.data.methodTransfer || DEFAULT_METHOD_PROGRESS.methodTransfer,
                events: data.data.events || [],
                autonomyScore: data.data.autonomyScore || 0,
                lastSyncedAt: new Date(),
              });
            }
          }
        } catch (error) {
          logger.error('Failed to fetch method progress', { error });
        } finally {
          set({ isLoading: false });
        }
      },

      syncToServer: async () => {
        const state = get();
        if (!state.userId) return;

        try {
          await fetch('/api/progress/autonomy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: state.userId,
              mindMaps: state.mindMaps,
              flashcards: state.flashcards,
              selfAssessment: state.selfAssessment,
              helpBehavior: state.helpBehavior,
              methodTransfer: state.methodTransfer,
              events: state.events.slice(-100), // Keep last 100 events
              autonomyScore: state.autonomyScore,
            }),
          });
          set({ lastSyncedAt: new Date() });
        } catch (error) {
          logger.error('Failed to sync method progress', { error });
        }
      },

      recordToolCreation: (tool, helpLevel, subject, qualityScore) => {
        const event: MethodEvent = {
          type: 'tool_created',
          tool,
          helpLevel,
          subject,
          qualityScore,
          timestamp: new Date(),
        };

        set((state) => {
          const newState = { ...state };

          // Update appropriate skill based on tool type
          if (tool === 'mind_map') {
            const mindMaps = { ...state.mindMaps };
            if (helpLevel === 'none') mindMaps.createdAlone++;
            else if (helpLevel === 'hints') mindMaps.createdWithHints++;
            else mindMaps.createdWithFullHelp++;

            if (qualityScore !== undefined) {
              const total = mindMaps.createdAlone + mindMaps.createdWithHints + mindMaps.createdWithFullHelp;
              mindMaps.avgQualityScore = (mindMaps.avgQualityScore * (total - 1) + qualityScore) / total;
            }

            const progress = (mindMaps.createdAlone * 3 + mindMaps.createdWithHints) * 5;
            mindMaps.level = calculateLevel(Math.min(100, progress));
            newState.mindMaps = mindMaps;
          } else if (tool === 'flashcard') {
            const flashcards = { ...state.flashcards };
            if (helpLevel === 'none') flashcards.createdAlone++;
            else flashcards.createdWithHints++;

            const progress = (flashcards.createdAlone * 2 + flashcards.createdWithHints) * 3;
            flashcards.level = calculateLevel(Math.min(100, progress));
            newState.flashcards = flashcards;
          }

          newState.events = [...state.events, event].slice(-100);
          newState.autonomyScore = calculateAutonomyScore(newState);
          newState.updatedAt = new Date();

          return newState;
        });

        // Sync to server after update
        setTimeout(() => get().syncToServer(), 1000);
      },

      recordSelfCorrection: (context, subject) => {
        const event: MethodEvent = {
          type: 'self_correction',
          context,
          subject,
          timestamp: new Date(),
        };

        set((state) => {
          const helpBehavior = { ...state.helpBehavior };
          helpBehavior.selfCorrections++;

          const progress = (helpBehavior.selfCorrections * 5 + helpBehavior.solvedAlone * 3);
          helpBehavior.level = calculateLevel(Math.min(100, progress));

          const newState = {
            ...state,
            helpBehavior,
            events: [...state.events, event].slice(-100),
            updatedAt: new Date(),
          };
          newState.autonomyScore = calculateAutonomyScore(newState);

          return newState;
        });

        setTimeout(() => get().syncToServer(), 1000);
      },

      recordHelpRequest: (context, timeElapsedSeconds, subject) => {
        const event: MethodEvent = {
          type: 'help_requested',
          context,
          timeElapsedSeconds,
          subject,
          timestamp: new Date(),
        };

        set((state) => {
          const helpBehavior = { ...state.helpBehavior };
          helpBehavior.questionsAsked++;

          // Update average time before asking
          const total = helpBehavior.questionsAsked;
          helpBehavior.avgTimeBeforeAsking =
            (helpBehavior.avgTimeBeforeAsking * (total - 1) + timeElapsedSeconds) / total;

          return {
            ...state,
            helpBehavior,
            events: [...state.events, event].slice(-100),
            updatedAt: new Date(),
          };
        });

        setTimeout(() => get().syncToServer(), 1000);
      },

      recordProblemSolvedAlone: (context, subject) => {
        const event: MethodEvent = {
          type: 'problem_solved_alone',
          context,
          subject,
          timestamp: new Date(),
        };

        set((state) => {
          const helpBehavior = { ...state.helpBehavior };
          helpBehavior.solvedAlone++;

          const progress = (helpBehavior.selfCorrections * 5 + helpBehavior.solvedAlone * 3);
          helpBehavior.level = calculateLevel(Math.min(100, progress));

          const newState = {
            ...state,
            helpBehavior,
            events: [...state.events, event].slice(-100),
            updatedAt: new Date(),
          };
          newState.autonomyScore = calculateAutonomyScore(newState);

          return newState;
        });

        setTimeout(() => get().syncToServer(), 1000);
      },

      recordMethodTransfer: (fromSubject, toSubject, method) => {
        const event: MethodEvent = {
          type: 'method_transferred',
          fromSubject,
          toSubject,
          method,
          timestamp: new Date(),
        };

        set((state) => {
          const methodTransfer = { ...state.methodTransfer };
          methodTransfer.adaptations++;

          if (!methodTransfer.subjectsApplied.includes(toSubject)) {
            methodTransfer.subjectsApplied = [...methodTransfer.subjectsApplied, toSubject];
          }

          if (!methodTransfer.successfulMethods.includes(method)) {
            methodTransfer.successfulMethods = [...methodTransfer.successfulMethods, method];
          }

          const progress = methodTransfer.subjectsApplied.length * 15 + methodTransfer.adaptations * 5;
          methodTransfer.level = calculateLevel(Math.min(100, progress));

          const newState = {
            ...state,
            methodTransfer,
            events: [...state.events, event].slice(-100),
            updatedAt: new Date(),
          };
          newState.autonomyScore = calculateAutonomyScore(newState);

          return newState;
        });

        setTimeout(() => get().syncToServer(), 1000);
      },

      getSkillLevel: (progress) => calculateLevel(progress),

      reset: () => {
        set({
          ...DEFAULT_METHOD_PROGRESS,
          userId: null,
          isLoading: false,
          lastSyncedAt: null,
        });
      },
    })
);
