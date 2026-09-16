'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { clientLogger as logger } from '@/lib/logger/client';
import { csrfFetch, getUserIdFromCookie, requireIdentityRefresh } from '@/lib/auth';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useRouter } from '@/i18n/navigation';
import { HeroSection } from './hero-section';
import { QuickStart } from './quick-start';
import { WelcomeFooter } from './welcome-footer';
import { LanguageSwitcher } from './language-switcher';
import { RodariStorySection } from './rodari-story-section';
import {
  LazyMaestriShowcaseSection,
  LazySupportSection,
  LazyAccessibilitySection,
  LazyFeaturesSection,
  LazyComplianceSection,
  LazyRobotSection,
} from './lazy';
import { trackWelcomeVisit, trackTrialStartClick } from '@/lib/funnel/client';
import type { ExistingUserData } from '../types';

interface LandingPageProps {
  existingUserData: ExistingUserData | null;
  onStartOnboarding: () => void;
}
const trialSessionResponse = z.object({ sessionId: z.string().min(1) });

export function LandingPage({ existingUserData, onStartOnboarding }: LandingPageProps) {
  const router = useRouter();
  const tSession = useTranslations('common.session');
  const [failed, setFailed] = useState(false);
  const isReturningUser = Boolean(existingUserData?.name);
  const hasTrackedVisit = useRef(false);

  // Track VISITOR funnel event on page load (once)
  useEffect(() => {
    if (!hasTrackedVisit.current && !isReturningUser) {
      hasTrackedVisit.current = true;
      trackWelcomeVisit();
    }
  }, [isReturningUser]);

  // Create trial session via API before granting access
  const createTrialSession = async () => {
    try {
      getUserIdFromCookie();
      const response = await csrfFetch('/api/trial/session', {
        method: 'POST',
      });
      if (!response.ok) {
        logger.warn('[LandingPage] Failed to create trial session', {
          status: response.status,
        });
        throw new Error('Trial session unavailable');
      }
      return trialSessionResponse.parse(await response.json()).sessionId;
    } catch (error) {
      logger.warn('[LandingPage] Trial session creation failed', {
        error: String(error),
      });
      throw error;
    }
  };

  // Handle skip - create trial session and go to app
  const handleSkip = async () => {
    setFailed(false);
    try {
      getUserIdFromCookie();
      logger.info('[WelcomePage] Skip clicked, creating trial session');

      // Track TRIAL_START funnel event
      await trackTrialStartClick();

      // Only create trial session for new users (returning users already have auth)
      let sessionId = !isReturningUser ? await createTrialSession() : undefined;

      // Save trial email if provided via TrialEmailForm
      const trialEmail =
        typeof window !== 'undefined' ? sessionStorage.getItem('mirrorbuddy-trial-email') : null;
      if (trialEmail) {
        try {
          if (!sessionId) {
            const sessionResponse = await fetch('/api/trial/session');
            if (!sessionResponse.ok)
              throw new Error(`Trial session HTTP ${sessionResponse.status}`);
            const ownedSession = trialSessionResponse.safeParse(await sessionResponse.json());
            if (ownedSession.success) sessionId = ownedSession.data.sessionId;
          }
          if (sessionId) {
            const emailResponse = await csrfFetch('/api/trial/email', {
              method: 'PATCH',
              body: JSON.stringify({ sessionId, email: trialEmail }),
            });
            if (!emailResponse.ok)
              throw new Error(`Trial email capture HTTP ${emailResponse.status}`);
          } else {
            logger.warn('[WelcomePage] Optional trial email capture skipped: no owned session');
          }
        } catch (error) {
          logger.warn('[WelcomePage] Optional trial email capture failed', {
            error: String(error),
          });
        }
      }

      const response = await csrfFetch('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({ hasCompletedOnboarding: true }),
      });

      if (!response.ok) {
        logger.error('[WelcomePage] Failed to persist onboarding completion', {
          status: response.status,
        });
        throw new Error('Onboarding completion failed');
      }

      await requireIdentityRefresh('authenticated');
      useOnboardingStore.getState().completeOnboarding();
      logger.info('[WelcomePage] Redirecting to dashboard');
      router.push('/');
    } catch (error) {
      logger.error('[WelcomePage] Error completing onboarding', {
        error: String(error),
      });
      setFailed(true);
    }
  };

  // Handle start with onboarding - create trial session and start flow
  const handleStartWithOnboarding = async () => {
    logger.info('[WelcomePage] Start clicked, creating trial session');
    setFailed(false);
    try {
      await createTrialSession();
      onStartOnboarding();
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Language Switcher - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <main className="min-h-screen flex flex-col items-center px-4 py-12">
        {failed && (
          <p role="alert" className="text-red-700 dark:text-red-300">
            {tSession('unavailable')}
          </p>
        )}
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full flex-1 flex flex-col items-center justify-center"
        >
          {/* Hero with logo, tagline, accessibility profiles */}
          <HeroSection userName={existingUserData?.name} isReturningUser={isReturningUser} />

          {/* CTA boxes: Beta Access | Trial Mode */}
          <QuickStart
            isReturningUser={isReturningUser}
            onStartWithVoice={handleStartWithOnboarding}
            onStartWithoutVoice={handleStartWithOnboarding}
            onSkip={handleSkip}
            onUpdateProfile={isReturningUser ? handleStartWithOnboarding : undefined}
          />

          {/* Professors carousel */}
          <LazyMaestriShowcaseSection />

          {/* Coaches & Buddies carousel */}
          <LazySupportSection />

          {/* Accessibility profiles */}
          <LazyAccessibilitySection />

          {/* Platform features */}
          <LazyFeaturesSection />

          {/* Optional Reachy Mini robot embodiment */}
          <LazyRobotSection />

          {/* Compliance & Transparency */}
          <LazyComplianceSection />
        </motion.div>

        {/* Welcome Footer with consent, legal, badges */}
        <WelcomeFooter />

        {/* Rodari story - literary inspiration */}
        <RodariStorySection />

        {/* Decorative blurs */}
        <div
          className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-pink-300/20 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-300/20 to-transparent rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"
          aria-hidden="true"
        />
      </main>
    </div>
  );
}
