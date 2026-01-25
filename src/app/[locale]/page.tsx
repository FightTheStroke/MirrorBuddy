"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { logger } from "@/lib/logger";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Trophy,
  Settings,
  Calendar,
  Heart,
  Sparkles,
  PencilRuler,
  Backpack,
} from "lucide-react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useProgressStore, useSettingsStore } from "@/lib/stores";
import { useConversationFlowStore } from "@/lib/stores/conversation-flow-store";
import { useParentInsightsIndicator } from "@/lib/hooks/use-parent-insights-indicator";
import { useTrialStatus } from "@/lib/hooks/use-trial-status";
import { useTrialToasts } from "@/lib/hooks/use-trial-toasts";
import { getUserIdFromCookie } from "@/lib/auth/client-auth";
import { cn } from "@/lib/utils";
import type { Maestro, ToolType } from "@/types";
import { MaestriGrid } from "@/components/maestros/maestri-grid";
import { MaestroSession } from "@/components/maestros/maestro-session";
import { LazyCalendarView, LazyGenitoriView } from "@/components/education";
import { ZainoView } from "@/app/[locale]/supporti/components/zaino-view";
import { AstuccioView } from "@/app/[locale]/astuccio/components/astuccio-view";
import { CharacterChatView } from "@/components/conversation";
import { LazySettingsView } from "@/components/settings";
import { LazyProgressView } from "@/components/progress";
import { TrialHomeBanner, TrialUsageDashboard } from "@/components/trial";
import { HomeHeader } from "./home-header";
import { HomeSidebar } from "./home-sidebar";
import { COACH_INFO, BUDDY_INFO } from "./home-constants";
import type { View, MaestroSessionMode } from "./types";

const MB_PER_LEVEL = 1000;

export default function Home() {
  const router = useRouter();
  const t = useTranslations("home");
  const { hasCompletedOnboarding, isHydrated, hydrateFromApi } =
    useOnboardingStore();

  useEffect(() => {
    hydrateFromApi();
  }, [hydrateFromApi]);

  useEffect(() => {
    if (isHydrated && !hasCompletedOnboarding) {
      router.push("/welcome");
    }
  }, [isHydrated, hasCompletedOnboarding, router]);

  const [currentView, setCurrentView] = useState<View>("maestri");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMaestro, setSelectedMaestro] = useState<Maestro | null>(null);
  const [maestroSessionMode, setMaestroSessionMode] =
    useState<MaestroSessionMode>("voice");
  const [maestroSessionKey, setMaestroSessionKey] = useState(0);
  const [requestedToolType, setRequestedToolType] = useState<
    ToolType | undefined
  >(undefined);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    seasonMirrorBucks,
    seasonLevel,
    currentSeason,
    streak,
    totalStudyMinutes,
    sessionsThisWeek,
    questionsAsked,
  } = useProgressStore();
  const { studentProfile } = useSettingsStore();
  const { hasNewInsights, markAsViewed } = useParentInsightsIndicator();
  const trialStatus = useTrialStatus();
  useTrialToasts(trialStatus);
  const {
    activeCharacter,
    conversationsByCharacter,
    endConversationWithSummary,
    isActive: isConversationActive,
  } = useConversationFlowStore();

  const handleViewChange = async (newView: View) => {
    if (isConversationActive && activeCharacter) {
      const characterConvo = conversationsByCharacter[activeCharacter.id];
      if (characterConvo?.conversationId) {
        const userId = getUserIdFromCookie();
        if (userId) {
          try {
            await endConversationWithSummary(
              characterConvo.conversationId,
              userId,
            );
          } catch (error) {
            logger.error("Failed to close conversation", {
              error: String(error),
            });
          }
        }
      }
    }
    setCurrentView(newView);
  };

  const handleToolRequest = (toolType: ToolType, maestro: Maestro) => {
    setRequestedToolType(toolType);
    setSelectedMaestro(maestro);
    setMaestroSessionMode("chat");
    setMaestroSessionKey((prev) => prev + 1);
    setCurrentView("maestro-session");
  };

  if (!isHydrated || !hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <h1 className="sr-only">{t("appTitle")}</h1>
        <div
          className="flex items-center justify-center min-h-screen"
          role="main"
        >
          <div className="animate-pulse text-slate-400">{t("loading")}</div>
        </div>
      </div>
    );
  }

  const mbInLevel = seasonMirrorBucks % MB_PER_LEVEL;
  const progressPercent = Math.min(100, (mbInLevel / MB_PER_LEVEL) * 100);
  const seasonName = currentSeason?.name || t("seasonDefault");
  const selectedCoach = studentProfile?.preferredCoach || "melissa";
  const selectedBuddy = studentProfile?.preferredBuddy || "mario";
  const coachInfo = COACH_INFO[selectedCoach];
  const buddyInfo = BUDDY_INFO[selectedBuddy];

  const navItems = [
    {
      id: "coach" as const,
      label: coachInfo.name,
      icon: Sparkles,
      isChat: true,
      avatar: coachInfo.avatar,
    },
    {
      id: "buddy" as const,
      label: buddyInfo.name,
      icon: Heart,
      isChat: true,
      avatar: buddyInfo.avatar,
    },
    { id: "maestri" as const, label: t("navigation.professors"), icon: GraduationCap },
    { id: "astuccio" as const, label: t("navigation.astuccio"), icon: PencilRuler },
    { id: "supporti" as const, label: t("navigation.zaino"), icon: Backpack },
    { id: "calendar" as const, label: t("navigation.calendar"), icon: Calendar },
    { id: "progress" as const, label: t("navigation.progress"), icon: Trophy },
    { id: "settings" as const, label: t("navigation.settings"), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <h1 className="sr-only">{t("appTitle")}</h1>
      <HomeHeader
        sidebarOpen={sidebarOpen}
        onMenuClick={() => setSidebarOpen(true)}
        seasonLevel={seasonLevel}
        mbInLevel={mbInLevel}
        mbNeeded={MB_PER_LEVEL}
        progressPercent={progressPercent}
        seasonName={seasonName}
        streak={streak}
        sessionsThisWeek={sessionsThisWeek}
        totalStudyMinutes={totalStudyMinutes}
        questionsAsked={questionsAsked}
        trialStatus={trialStatus}
      />

      <HomeSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentView={currentView}
        onViewChange={handleViewChange}
        navItems={navItems}
        hasNewInsights={hasNewInsights}
        onParentAccess={() => {
          markAsViewed();
          handleViewChange("genitori");
        }}
        trialStatus={trialStatus}
      />

      <div
        className={cn(
          "flex gap-6 transition-all duration-300 px-4 sm:px-6 lg:px-8 pt-20 pb-6",
          sidebarOpen ? "lg:ml-64" : "lg:ml-20",
        )}
      >
        <main className="min-h-screen flex-1">
          {/* Trial mode banner */}
          {trialStatus.isTrialMode && !trialStatus.isLoading && (
            <TrialHomeBanner
              chatsRemaining={trialStatus.chatsRemaining}
              maxChats={trialStatus.maxChats}
              visitorId={trialStatus.visitorId}
            />
          )}

          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {currentView === "coach" && (
              <CharacterChatView
                characterId={selectedCoach}
                characterType="coach"
              />
            )}
            {currentView === "buddy" && (
              <CharacterChatView
                characterId={selectedBuddy}
                characterType="buddy"
              />
            )}
            {currentView === "maestri" && (
              <MaestriGrid
                onMaestroSelect={(maestro, mode) => {
                  setSelectedMaestro(maestro);
                  setMaestroSessionMode(mode);
                  setMaestroSessionKey((prev) => prev + 1);
                  setCurrentView("maestro-session");
                }}
              />
            )}
            {currentView === "maestro-session" && selectedMaestro && (
              <MaestroSession
                key={`maestro-${selectedMaestro.id}-${maestroSessionKey}`}
                maestro={selectedMaestro}
                onClose={() => {
                  setCurrentView("maestri");
                  setRequestedToolType(undefined);
                }}
                initialMode={maestroSessionMode}
                requestedToolType={requestedToolType}
              />
            )}
            {currentView === "astuccio" && (
              <AstuccioView onToolRequest={handleToolRequest} />
            )}
            {currentView === "supporti" && <ZainoView />}
            {currentView === "calendar" && <LazyCalendarView />}
            {currentView === "progress" && <LazyProgressView />}
            {currentView === "genitori" && <LazyGenitoriView />}
            {currentView === "settings" && <LazySettingsView />}
          </motion.div>
        </main>

        {/* Trial usage dashboard sidebar - visible only in trial mode on lg screens */}
        {trialStatus.isTrialMode && !trialStatus.isLoading && (
          <aside className="w-80 hidden lg:block flex-shrink-0">
            <TrialUsageDashboard />
          </aside>
        )}
      </div>
    </div>
  );
}
