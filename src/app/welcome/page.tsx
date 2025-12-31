'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore, getStepIndex, getTotalSteps } from '@/lib/stores/onboarding-store';
import { WelcomeStep } from './components/welcome-step';
import { InfoStep } from './components/info-step';
import { PrinciplesStep } from './components/principles-step';
import { MaestriStep } from './components/maestri-step';
import { ReadyStep } from './components/ready-step';
import { cn } from '@/lib/utils';

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReplay = searchParams.get('replay') === 'true';

  const {
    hasCompletedOnboarding,
    currentStep,
    isReplayMode,
    startReplay,
  } = useOnboardingStore();

  // Handle replay mode
  useEffect(() => {
    if (isReplay && !isReplayMode) {
      startReplay();
    }
  }, [isReplay, isReplayMode, startReplay]);

  // Redirect if already completed and not in replay mode
  useEffect(() => {
    if (hasCompletedOnboarding && !isReplay && !isReplayMode) {
      router.push('/');
    }
  }, [hasCompletedOnboarding, isReplay, isReplayMode, router]);

  const stepIndex = getStepIndex(currentStep);
  const totalSteps = getTotalSteps();

  // Step components mapping
  const stepComponents = {
    welcome: WelcomeStep,
    info: InfoStep,
    principles: PrinciplesStep,
    maestri: MaestriStep,
    ready: ReadyStep,
  };

  const CurrentStepComponent = stepComponents[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-blue-950">
      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Benvenuto in ConvergioEdu
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-500">
              {stepIndex + 1} / {totalSteps}
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                  i < stepIndex
                    ? 'bg-pink-500'
                    : i === stepIndex
                      ? 'bg-pink-400'
                      : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-20 pb-8 px-4 min-h-screen flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-2xl"
          >
            <CurrentStepComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-blue-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Caricamento...</div>
      </div>
    }>
      <WelcomeContent />
    </Suspense>
  );
}
