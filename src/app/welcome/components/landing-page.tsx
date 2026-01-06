import { motion } from 'framer-motion';
import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useRouter } from 'next/navigation';
import { HeroSection } from './hero-section';
import { MaestriShowcaseSection } from './maestri-showcase-section';
import { SupportSection } from './support-section';
import { FeaturesSection } from './features-section';
import { QuickStart } from './quick-start';
import type { ExistingUserData } from '../types';

interface LandingPageProps {
  existingUserData: ExistingUserData | null;
  onStartOnboarding: () => void;
}

export function LandingPage({ existingUserData, onStartOnboarding }: LandingPageProps) {
  const router = useRouter();
  const isReturningUser = Boolean(existingUserData?.name);

  const handleSkipWithConfirmation = async () => {
    try {
      logger.info('[WelcomePage] Skip button clicked, marking onboarding complete');

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasCompletedOnboarding: true }),
      });

      if (!response.ok) {
        logger.error('[WelcomePage] Failed to persist onboarding completion', {
          status: response.status,
        });
      }

      useOnboardingStore.getState().completeOnboarding();
      logger.info('[WelcomePage] Redirecting to dashboard');
      router.push('/');
    } catch (error) {
      logger.error('[WelcomePage] Error in handleSkipWithConfirmation', { error: String(error) });
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full"
        >
          <HeroSection
            userName={existingUserData?.name}
            isReturningUser={isReturningUser}
          />
          <MaestriShowcaseSection />
          <SupportSection />
          <FeaturesSection />
          <QuickStart
            isReturningUser={isReturningUser}
            onStartWithVoice={onStartOnboarding}
            onStartWithoutVoice={onStartOnboarding}
            onSkip={handleSkipWithConfirmation}
            onUpdateProfile={isReturningUser ? onStartOnboarding : undefined}
          />
        </motion.div>

        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-pink-300/20 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-300/20 to-transparent rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
      </div>
    </div>
  );
}

