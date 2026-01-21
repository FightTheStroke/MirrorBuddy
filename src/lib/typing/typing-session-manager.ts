'use client';

import { useCallback, useRef, useState } from 'react';
import type { TypingLesson, LessonResult } from '@/types/tools';
import { createWPMCalculator, type WPMResult } from '@/lib/typing/wpm-calculator';
import { createKeyMappingEngine } from '@/lib/typing/key-mapping-engine';

export interface SessionState {
  isActive: boolean;
  isPaused: boolean;
  isComplete: boolean;
  currentLesson: TypingLesson | null;
  elapsedTime: number;
  progress: number;
}

export function useTypingSession() {
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: false,
    isPaused: false,
    isComplete: false,
    currentLesson: null,
    elapsedTime: 0,
    progress: 0,
  });

  const engineRef = useRef<ReturnType<typeof createKeyMappingEngine> | null>(null);
  const wpmCalculatorRef = useRef<ReturnType<typeof createWPMCalculator> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startSession = useCallback((lesson: TypingLesson) => {
    if (sessionState.isActive) return;

    engineRef.current = createKeyMappingEngine(lesson.text);
    wpmCalculatorRef.current = createWPMCalculator();

    setSessionState({
      isActive: true,
      isPaused: false,
      isComplete: false,
      currentLesson: lesson,
      elapsedTime: 0,
      progress: 0,
    });

    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setSessionState(prev => ({
        ...prev,
        elapsedTime: elapsed / 1000,
      }));
    }, 1000);
  }, [sessionState.isActive]);

  const pauseSession = useCallback(() => {
    if (!sessionState.isActive || sessionState.isPaused) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    wpmCalculatorRef.current?.finish();

    setSessionState(prev => ({
      ...prev,
      isPaused: true,
    }));
  }, [sessionState.isActive, sessionState.isPaused]);

  const resumeSession = useCallback(() => {
    if (!sessionState.isActive || !sessionState.isPaused) return;

    startTimeRef.current = Date.now() - sessionState.elapsedTime * 1000;
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setSessionState(prev => ({
        ...prev,
        elapsedTime: elapsed / 1000,
      }));
    }, 1000);

    setSessionState(prev => ({
      ...prev,
      isPaused: false,
    }));
  }, [sessionState.isActive, sessionState.isPaused, sessionState.elapsedTime]);

  const endSession = useCallback((): WPMResult | null => {
    if (!sessionState.isActive || !wpmCalculatorRef.current) return null;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    wpmCalculatorRef.current.finish();

    const validationState = engineRef.current?.getValidationState();
    const lessonResult: LessonResult | null = sessionState.currentLesson && validationState
      ? {
          lessonId: sessionState.currentLesson.id,
          duration: sessionState.elapsedTime,
          correctKeystrokes: validationState.correctKeystrokes,
          totalKeystrokes: validationState.totalKeystrokes,
          accuracy: engineRef.current?.getAccuracy() || 0,
          wpm: wpmCalculatorRef.current.getWPM(),
          completed: engineRef.current?.isComplete() || false,
          timestamp: new Date(),
        }
      : null;

    const wpmResult = wpmCalculatorRef.current.getResult();

    setSessionState({
      isActive: false,
      isPaused: false,
      isComplete: true,
      currentLesson: null,
      elapsedTime: 0,
      progress: 0,
    });

    if (lessonResult) {
      return {
        ...wpmResult,
        lessonResult,
      } as WPMResult & { lessonResult: LessonResult };
    }

    return null;
  }, [sessionState]);

  const resetSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    engineRef.current = null;
    wpmCalculatorRef.current = null;
    startTimeRef.current = 0;

    setSessionState({
      isActive: false,
      isPaused: false,
      isComplete: false,
      currentLesson: null,
      elapsedTime: 0,
      progress: 0,
    });
  }, []);

  const updateProgress = useCallback(() => {
    if (!engineRef.current || !sessionState.currentLesson) return;

    const currentIndex = engineRef.current.getValidationState().currentIndex;
    const totalLength = sessionState.currentLesson.text.length;
    const progressPercent = (currentIndex / totalLength) * 100;

    setSessionState(prev => ({
      ...prev,
      progress: progressPercent,
    }));
  }, [sessionState.currentLesson]);

  const getWPMStats = useCallback(() => {
    return wpmCalculatorRef.current?.getStats() || null;
  }, []);

  return {
    sessionState,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    resetSession,
    updateProgress,
    getWPMStats,
  };
}
