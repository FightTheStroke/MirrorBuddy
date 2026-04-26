/**
 * Method Progress Store - Zustand store for autonomy tracking
 * Tracks HOW students learn, not just WHAT they learn
 * Issue #28
 */

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth';
import type {
  MethodProgress,
  SkillLevel,
  ToolType,
  HelpLevel,
  Subject,
} from '@/lib/method-progress/types';
import { DEFAULT_METHOD_PROGRESS } from '@/lib/method-progress/types';
import { calculateLevel, calculateAutonomyScore } from './method-progress-utils';
import {
  handleToolCreation,
  handleSelfCorrection,
  handleHelpRequest,
  handleProblemSolvedAlone,
  handleMethodTransfer,
} from './method-progress-handlers';

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
          logger.error('Failed to fetch method progress', undefined, error);
        } finally {
          set({ isLoading: false });
        }
      },

      syncToServer: async () => {
        const state = get();
        if (!state.userId) return;

        try {
          await csrfFetch('/api/progress/autonomy', {
            method: 'POST',
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
          logger.error('Failed to sync method progress', undefined, error);
        }
      },

      recordToolCreation: (tool, helpLevel, subject, qualityScore) => {
        set((state) => {
          if (!state.userId) return state;
          const progressState: MethodProgress = {
            ...state,
            userId: state.userId,
          };
          const updates = handleToolCreation(progressState, tool, helpLevel, subject, qualityScore);
          const newState = { ...state, ...updates };
          newState.autonomyScore = calculateAutonomyScore(newState);
          return newState;
        });
        setTimeout(() => get().syncToServer(), 1000);
      },

      recordSelfCorrection: (context, subject) => {
        set((state) => {
          if (!state.userId) return state;
          const progressState: MethodProgress = {
            ...state,
            userId: state.userId,
          };
          const updates = handleSelfCorrection(progressState, context, subject);
          const newState = { ...state, ...updates };
          newState.autonomyScore = calculateAutonomyScore(newState);
          return newState;
        });
        setTimeout(() => get().syncToServer(), 1000);
      },

      recordHelpRequest: (context, timeElapsedSeconds, subject) => {
        set((state) => {
          if (!state.userId) return state;
          const progressState: MethodProgress = {
            ...state,
            userId: state.userId,
          };
          const updates = handleHelpRequest(progressState, context, timeElapsedSeconds, subject);
          return { ...state, ...updates };
        });
        setTimeout(() => get().syncToServer(), 1000);
      },

      recordProblemSolvedAlone: (context, subject) => {
        set((state) => {
          if (!state.userId) return state;
          const progressState: MethodProgress = {
            ...state,
            userId: state.userId,
          };
          const updates = handleProblemSolvedAlone(progressState, context, subject);
          const newState = { ...state, ...updates };
          newState.autonomyScore = calculateAutonomyScore(newState);
          return newState;
        });
        setTimeout(() => get().syncToServer(), 1000);
      },

      recordMethodTransfer: (fromSubject, toSubject, method) => {
        set((state) => {
          if (!state.userId) return state;
          const progressState: MethodProgress = {
            ...state,
            userId: state.userId,
          };
          const updates = handleMethodTransfer(progressState, fromSubject, toSubject, method);
          const newState = { ...state, ...updates };
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
