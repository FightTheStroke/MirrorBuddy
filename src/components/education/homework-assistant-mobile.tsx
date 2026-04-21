/**
 * HomeworkAssistantMobile Component
 *
 * Camera-first mobile homework assistant with step-by-step solution display.
 * Requirement: F-31 - Homework assistant supports camera-first workflow on mobile
 *
 * Features:
 * - Camera button prominent on mobile (top action)
 * - Quick photo capture → analysis workflow
 * - Gallery picker as alternative
 * - Subject selection with large touch targets (44px+)
 * - Step-by-step solution display readable on mobile
 * - Responsive: camera-first on mobile, text-first on desktop
 * - Uses TouchTarget and xs: breakpoint
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { InputSection } from './homework-assistant-mobile/input-section';
import { SolutionDisplay, Solution } from './homework-assistant-mobile/solution-display';
import { useTranslations } from 'next-intl';

interface AnalysisPayload {
  file: File;
  subject?: string;
  imageData?: string;
}

interface HomeworkAssistantMobileProps {
  onAnalyze: (payload: AnalysisPayload) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function HomeworkAssistantMobile({
  onAnalyze,
  onError,
  className,
}: HomeworkAssistantMobileProps) {
  const t = useTranslations('education');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);

  // Track mount state + active timers so unmounting cancels pending updates.
  // Without this, tests that unmount before the simulated-progress timer
  // fires hit "window is not defined" on a stale setState.
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      // Reset state
      setError(null);
      setAnalysisSuccess(false);
      setSolution(null);
      setIsAnalyzing(true);
      setUploadProgress(0);

      // Simulate progress
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        setUploadProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 30));
      }, 200);

      // Trigger analysis callback
      onAnalyze({
        file,
        subject: selectedSubject || undefined,
      });

      // Simulate analysis completion
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!mountedRef.current) return;
        setUploadProgress(100);
        setIsAnalyzing(false);
        setAnalysisSuccess(true);

        // Mock solution display
        setSolution({
          steps: [
            'Step 1: Identify the problem type',
            'Step 2: Gather necessary information',
            'Step 3: Apply relevant formulas',
            'Step 4: Calculate the answer',
            'Step 5: Verify the result',
          ],
          answer: 'The solution is displayed here',
          explanation: 'Detailed explanation of the solution process and approach',
        });

        setTimeout(() => {
          setAnalysisSuccess(false);
          setUploadProgress(0);
        }, 2000);
      }, 1500);
    },
    [selectedSubject, onAnalyze],
  );

  const handleReset = () => {
    setSolution(null);
    setError(null);
    setSelectedSubject('');
    setUploadProgress(0);
  };

  const handleError = useCallback(
    (err: string) => {
      setError(err);
      onError?.(err);
    },
    [onError],
  );

  return (
    <div
      className={cn(
        'w-full max-w-2xl mx-auto p-4 xs:p-6',
        'bg-white dark:bg-slate-950',
        'rounded-lg border border-slate-200 dark:border-slate-800',
        'shadow-sm dark:shadow-lg',
        className,
      )}
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl xs:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500" />
          {t('homeworkAssistant')}
        </h2>
        <p className="text-sm xs:text-base text-slate-600 dark:text-slate-400 mt-2">
          {t('captureOrUploadYourHomeworkToGetStepByStepSolution')}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!solution ? (
          <InputSection
            key="input"
            onFileSelect={handleFileSelect}
            onError={handleError}
            isAnalyzing={isAnalyzing}
            uploadProgress={uploadProgress}
            error={error}
            analysisSuccess={analysisSuccess}
            selectedSubject={selectedSubject}
            onSubjectSelect={setSelectedSubject}
          />
        ) : (
          <SolutionDisplay
            key="solution"
            solution={solution}
            selectedSubject={selectedSubject}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
