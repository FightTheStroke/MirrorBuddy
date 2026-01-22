import { motion } from "framer-motion";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useRouter } from "next/navigation";
import { HeroSectionV3 } from "./hero-section-v3";
import { QuickStartVerticalV2 } from "./quick-start-vertical-v2";
import { MaestriShowcaseSectionV2 } from "./maestri-showcase-section-v2";
import { SupportSection } from "./support-section";
import { FeaturesSection } from "./features-section";
import { WelcomeFooter } from "./welcome-footer";
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
      <div className="min-h-screen flex flex-col items-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full flex-1 flex flex-col items-center justify-center"
        >
          {/* Hero Section with Beta Badge */}
          <HeroSectionV3
            userName={existingUserData?.name}
            isReturningUser={isReturningUser}
          />

          {/* Quick Start - Login/Trial BEFORE Maestri */}
          <QuickStartVerticalV2
            isReturningUser={isReturningUser}
            onStartWithVoice={handleStartWithOnboarding}
            onStartWithoutVoice={handleStartWithOnboarding}
            onSkip={handleSkip}
            onUpdateProfile={
              isReturningUser ? handleStartWithOnboarding : undefined
            }
          />

          {/* Maestri Showcase - No duplications */}
          <MaestriShowcaseSectionV2 />

          {/* Support Section */}
          <SupportSection />

          {/* Features Section */}
          <FeaturesSection />
        </motion.div>

        {/* Welcome Footer with consent, legal, badges */}
        <WelcomeFooter />

        {/* Decorative blurs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-pink-300/20 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-300/20 to-transparent rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
      </div>
    </div>
  );
}
