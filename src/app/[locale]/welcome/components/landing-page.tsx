"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useRouter } from "next/navigation";
import { HeroSection } from "./hero-section";
import { MaestriShowcaseSection } from "./maestri-showcase-section";
import { SupportSection } from "./support-section";
import { FeaturesSection } from "./features-section";
import { ComplianceSection } from "./compliance-section";
import { QuickStart } from "./quick-start";
import { WelcomeFooter } from "./welcome-footer";
import { TierComparisonSection } from "./tier-comparison-section";
import { LanguageSwitcher } from "./language-switcher";
import { trackWelcomeVisit, trackTrialStartClick } from "@/lib/funnel/client";
import type { ExistingUserData } from "../types";

interface LandingPageProps {
  existingUserData: ExistingUserData | null;
  onStartOnboarding: () => void;
}

export function LandingPage({
  existingUserData,
  onStartOnboarding,
}: LandingPageProps) {
  const router = useRouter();
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
      const response = await csrfFetch("/api/trial/session", {
        method: "POST",
      });
      if (!response.ok) {
        logger.warn("[LandingPage] Failed to create trial session", {
          status: response.status,
        });
      }
    } catch (error) {
      logger.warn("[LandingPage] Trial session creation failed", {
        error: String(error),
      });
    }
  };

  // Handle skip - create trial session and go to app
  const handleSkip = async () => {
    logger.info("[WelcomePage] Skip clicked, creating trial session");

    // Track TRIAL_START funnel event
    await trackTrialStartClick();

    await createTrialSession();

    try {
      const response = await csrfFetch("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({ hasCompletedOnboarding: true }),
      });

      if (!response.ok) {
        logger.error("[WelcomePage] Failed to persist onboarding completion", {
          status: response.status,
        });
      }

      useOnboardingStore.getState().completeOnboarding();
      logger.info("[WelcomePage] Redirecting to dashboard");
      router.push("/");
    } catch (error) {
      logger.error("[WelcomePage] Error completing onboarding", {
        error: String(error),
      });
      router.push("/");
    }
  };

  // Handle start with onboarding - create trial session and start flow
  const handleStartWithOnboarding = async () => {
    logger.info("[WelcomePage] Start clicked, creating trial session");
    await createTrialSession();
    onStartOnboarding();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Language Switcher - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <main
        className="min-h-screen flex flex-col items-center px-4 py-12"
        id="main-content"
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full flex-1 flex flex-col items-center justify-center"
        >
          {/* Hero with logo, tagline, accessibility profiles */}
          <HeroSection
            userName={existingUserData?.name}
            isReturningUser={isReturningUser}
          />

          {/* CTA boxes: Beta Access | Trial Mode */}
          <QuickStart
            isReturningUser={isReturningUser}
            onStartWithVoice={handleStartWithOnboarding}
            onStartWithoutVoice={handleStartWithOnboarding}
            onSkip={handleSkip}
            onUpdateProfile={
              isReturningUser ? handleStartWithOnboarding : undefined
            }
          />

          {/* Tier comparison cards */}
          <TierComparisonSection />

          {/* Professors carousel */}
          <MaestriShowcaseSection />

          {/* Coaches & Buddies carousel */}
          <SupportSection />

          {/* Platform features */}
          <FeaturesSection />

          {/* Compliance & Transparency */}
          <ComplianceSection />
        </motion.div>

        {/* Welcome Footer with consent, legal, badges */}
        <WelcomeFooter />

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
