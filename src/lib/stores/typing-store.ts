"use client";

import { create } from "zustand";
import type {
  TypingProgress,
  TypingLesson,
  LessonResult,
  KeyboardLayout,
  TypingHandMode,
  TypingLevel,
  TypingStats,
} from "@/types/tools";

export interface TypingSessionState {
  currentLesson: TypingLesson | null;
  currentLessonIndex: number;
  startTime: number | null;
  keystrokes: string[];
  completed: boolean;
  isPaused: boolean;
}

export interface TypingState extends TypingSessionState {
  progress: TypingProgress | null;
  currentLayout: KeyboardLayout;
  currentHandMode: TypingHandMode;
  currentLevel: TypingLevel;

  startLesson: (lesson: TypingLesson) => void;
  recordKeystroke: (key: string, expected: string) => void;
  endLesson: (result: LessonResult) => void;
  pauseLesson: () => void;
  resumeLesson: () => void;
  resetSession: () => void;

  setKeyboardLayout: (layout: KeyboardLayout) => void;
  setHandMode: (mode: TypingHandMode) => void;
  setCurrentLevel: (level: TypingLevel) => void;

  updateProgress: (progress: Partial<TypingProgress>) => void;
  addLessonResult: (result: LessonResult) => void;
  loadProgress: (userId: string) => Promise<void>;
  saveProgress: () => Promise<void>;
}

const createInitialStats = (): TypingStats => ({
  totalLessonsCompleted: 0,
  totalKeystrokes: 0,
  totalAccuracy: 0,
  bestWPM: 0,
  averageWPM: 0,
  streakDays: 0,
  points: 0,
  badges: [],
});

const createInitialProgress = (userId: string): TypingProgress => ({
  userId,
  currentLevel: "beginner",
  keyboardLayout: "qwertz",
  handMode: "both",
  lessons: new Map(),
  stats: createInitialStats(),
});

const initialSessionState: TypingSessionState = {
  currentLesson: null,
  currentLessonIndex: 0,
  startTime: null,
  keystrokes: [],
  completed: false,
  isPaused: false,
};

export const useTypingStore = create<TypingState>()((set, get) => ({
  ...initialSessionState,
  progress: null,
  currentLayout: "qwertz",
  currentHandMode: "both",
  currentLevel: "beginner",

  startLesson: (lesson) =>
    set({
      currentLesson: lesson,
      startTime: Date.now(),
      keystrokes: [],
      completed: false,
      isPaused: false,
    }),

  recordKeystroke: (key, _expected) =>
    set((state) => ({
      keystrokes: [...state.keystrokes, key],
    })),

  endLesson: (result) =>
    set((state) => {
      const updatedLessons = new Map(state.progress?.lessons || []);
      updatedLessons.set(result.lessonId, result);

      const updatedStats = state.progress?.stats
        ? { ...state.progress.stats }
        : createInitialStats();
      updatedStats.totalLessonsCompleted += 1;
      updatedStats.totalKeystrokes += result.totalKeystrokes;

      const newTotalAccuracy =
        updatedStats.totalAccuracy === 0
          ? result.accuracy
          : (updatedStats.totalAccuracy + result.accuracy) / 2;
      updatedStats.totalAccuracy = newTotalAccuracy;

      if (result.wpm > updatedStats.bestWPM) {
        updatedStats.bestWPM = result.wpm;
      }

      updatedStats.averageWPM = result.completed
        ? (updatedStats.averageWPM + result.wpm) / 2
        : updatedStats.averageWPM;

      updatedStats.points += Math.floor(result.wpm * result.accuracy * 0.1);

      return {
        ...initialSessionState,
        progress: state.progress
          ? {
              ...state.progress,
              lessons: updatedLessons,
              stats: updatedStats,
              lastPlayed: new Date(),
            }
          : null,
      };
    }),

  pauseLesson: () =>
    set((_state) => ({
      isPaused: true,
    })),

  resumeLesson: () =>
    set((state) => ({
      isPaused: false,
      startTime: state.startTime
        ? state.startTime + (Date.now() - state.startTime)
        : Date.now(),
    })),

  resetSession: () => set(initialSessionState),

  setKeyboardLayout: (layout) =>
    set({
      currentLayout: layout,
    }),

  setHandMode: (mode) =>
    set({
      currentHandMode: mode,
    }),

  setCurrentLevel: (level) =>
    set({
      currentLevel: level,
    }),

  updateProgress: (partialProgress) =>
    set((state) => ({
      progress: state.progress
        ? { ...state.progress, ...partialProgress }
        : null,
    })),

  addLessonResult: (result) =>
    set((state) => {
      const updatedLessons = new Map(state.progress?.lessons || []);
      updatedLessons.set(result.lessonId, result);

      return {
        progress: state.progress
          ? { ...state.progress, lessons: updatedLessons }
          : null,
      };
    }),

  loadProgress: async (userId) => {
    try {
      const response = await fetch(`/api/typing?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        const lessonsMap = new Map(
          Object.entries(data.lessons || {}).map(([k, v]) => [
            k,
            v as LessonResult,
          ]),
        );

        set({
          progress: {
            ...data,
            lessons: lessonsMap,
          },
          currentLayout: data.keyboardLayout || "qwertz",
          currentHandMode: data.handMode || "both",
          currentLevel: data.currentLevel || "beginner",
        });
      } else {
        set({
          progress: createInitialProgress(userId),
        });
      }
    } catch (error) {
      console.error("Failed to load typing progress:", error);
      set({
        progress: createInitialProgress(userId),
      });
    }
  },

  saveProgress: async () => {
    const { progress } = get();
    if (!progress) return;

    try {
      const lessonsObj = Object.fromEntries(progress.lessons);
      const { csrfFetch } = await import("@/lib/auth/csrf-client");
      const response = await csrfFetch("/api/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...progress,
          lessons: lessonsObj,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save typing progress");
      }
    } catch (error) {
      console.error("Failed to save typing progress:", error);
    }
  },
}));
