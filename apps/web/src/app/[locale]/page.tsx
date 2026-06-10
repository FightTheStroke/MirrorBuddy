'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { clientLogger as logger } from '@/lib/logger/client';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Trophy,
  Settings,
  Calendar,
  Backpack,
  Home as HomeIcon,
} from 'lucide-react';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useProgressStore, useSettingsStore } from '@/lib/stores';
import { useConversationFlowStore } from '@/lib/stores/conversation-flow-store';
import { useParentInsightsIndicator } from '@/lib/hooks/use-parent-insights-indicator';
import { useTrialStatus } from '@/lib/hooks/use-trial-status';
import { useTrialToasts } from '@/lib/hooks/use-trial-toasts';
import { getUserIdFromCookie } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { Maestro, ToolType } from '@/types';
import { MaestriGrid } from '@/components/maestros/maestri-grid';
import { LazyCalendarView, LazyGenitoriView } from '@/components/education';
import { LazySettingsView } from '@/components/settings';
import { LazyProgressView } from '@/components/progress';
import { TrialHomeBanner, TrialUsageDashboard } from '@/components/trial';
import { HomeHeader } from './home-header';
import { HomeSidebar } from './home-sidebar';
import { HomeIntentChooser, type IntentStart } from './home-intent-chooser';
import type { View, MaestroSessionMode } from './types';
import {
  LazyMaestroSession,
  LazyCharacterChatView,
  LazyAstuccioView,
  LazyZainoView,
  HomeShellSkeleton,
} from './home-lazy';

const MB_PER_LEVEL = 1000;

export default function Home() {
  const router = useRouter();
  const t = useTranslations('home');
  const mainContentRef = useRef<HTMLDivElement>(null);
  const { hasCompletedOnboarding, isHydrated, hydrateFromApi } = useOnboardingStore();

  useEffect(() => {
    hydrateFromApi();
  }, [hydrateFromApi]);

  useEffect(() => {
    if (isHydrated && !hasCompletedOnboarding) {
      router.push('/welcome');
    }
  }, [isHydrated, hasCompletedOnboarding, router]);

  const [currentView, setCurrentView] = useState<View>('intent');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedMaestro, setSelectedMaestro] = useState<Maestro | null>(null);
  const [maestroSessionMode, setMaestroSessionMode] = useState<MaestroSessionMode>('voice');
  const [maestroSessionKey, setMaestroSessionKey] = useState(0);
  const [requestedToolType, setRequestedToolType] = useState<ToolType | undefined>(undefined);
  const [sessionContextMessage, setSessionContextMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Announce view changes to SR by focusing the section heading.
  // Skips the initial render to avoid disrupting natural Tab order on page load
  // (WCAG 2.1 §3.2: no unexpected context change).
  const prevView = useRef<View | null>(null);
  useEffect(() => {
    if (prevView.current === null) {
      prevView.current = currentView;
      return;
    }
    if (prevView.current !== currentView) {
      prevView.current = currentView;
      if (mainContentRef.current && isHydrated && hasCompletedOnboarding) {
        const mainHeading = mainContentRef.current.querySelector<HTMLElement>('h2[tabindex="-1"]');
        mainHeading?.focus();
      }
    }
  }, [currentView, isHydrated, hasCompletedOnboarding]);

  const { seasonMirrorBucks, seasonLevel, currentSeason, streak } = useProgressStore();
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
            await endConversationWithSummary(characterConvo.conversationId, userId);
          } catch (error) {
            logger.error('Failed to close conversation', {
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
    setMaestroSessionMode('chat');
    setSessionContextMessage(undefined);
    setMaestroSessionKey((prev) => prev + 1);
    setCurrentView('maestro-session');
  };

  // Intention-based entry: each intent resolves to a Maestro (auto-selected by
  // subject) and opens a session pre-framed with a context message. The
  // student never picks a professor from the 26-Maestri grid.
  const handleIntentStart = (start: IntentStart) => {
    setSelectedMaestro(start.maestro);
    setMaestroSessionMode(start.mode);
    setRequestedToolType(start.requestedToolType);
    setSessionContextMessage(start.contextMessage);
    setMaestroSessionKey((prev) => prev + 1);
    setCurrentView('maestro-session');
  };

  if (!isHydrated || !hasCompletedOnboarding) {
    return <HomeShellSkeleton title={t('appTitle')} />;
  }

  const mbInLevel = seasonMirrorBucks % MB_PER_LEVEL;
  const progressPercent = Math.min(100, (mbInLevel / MB_PER_LEVEL) * 100);
  const seasonName = currentSeason?.name || t('seasonDefault');
  const selectedCoach = studentProfile?.preferredCoach || 'melissa';
  const selectedBuddy = studentProfile?.preferredBuddy || 'mario';

  // Child space: only three friendly destinations. The 26-Maestri grid, the
  // coach/buddy character chats and the standalone tools launcher are
  // intentionally NOT here — they would re-introduce the choice overload the
  // intention-based home is meant to remove.
  const childNavItems = [
    {
      id: 'intent' as const,
      label: t('navigation.home'),
      icon: HomeIcon,
    },
    { id: 'supporti' as const, label: t('navigation.myWork'), icon: Backpack },
    { id: 'progress' as const, label: t('navigation.myRewards'), icon: Trophy },
  ];

  // Grown-up space: shown under a clearly separated "for grown-ups" group so a
  // child does not wander into the professor grid, the planner or settings.
  const grownUpNavItems = [
    {
      id: 'maestri' as const,
      label: t('navigation.professors'),
      icon: GraduationCap,
    },
    {
      id: 'calendar' as const,
      label: t('navigation.calendar'),
      icon: Calendar,
    },
    {
      id: 'settings' as const,
      label: t('navigation.settings'),
      icon: Settings,
    },
  ];

  const isSessionActive =
    currentView === 'maestro-session' || currentView === 'coach' || currentView === 'buddy';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 overflow-x-hidden">
      <h1 className="sr-only">{t('appTitle')}</h1>

      {/* Full-screen session overlays — above HomeHeader (z-50) to prevent overlap */}
      {currentView === 'maestro-session' && selectedMaestro && (
        <div className="fixed inset-0 z-[55] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
          <LazyMaestroSession
            key={`maestro-${selectedMaestro.id}-${maestroSessionKey}`}
            maestro={selectedMaestro}
            onClose={() => {
              setCurrentView('intent');
              setRequestedToolType(undefined);
              setSessionContextMessage(undefined);
            }}
            initialMode={maestroSessionMode}
            requestedToolType={requestedToolType}
            contextMessage={sessionContextMessage}
          />
        </div>
      )}
      {currentView === 'coach' && (
        <div className="fixed inset-0 z-[55] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
          <LazyCharacterChatView
            characterId={selectedCoach}
            characterType="coach"
            onClose={() => setCurrentView('maestri')}
          />
        </div>
      )}
      {currentView === 'buddy' && (
        <div className="fixed inset-0 z-[55] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
          <LazyCharacterChatView
            characterId={selectedBuddy}
            characterType="buddy"
            onClose={() => setCurrentView('maestri')}
          />
        </div>
      )}

      {/* Hide header and sidebar during full-screen sessions */}
      {!isSessionActive && (
        <>
          <HomeHeader
            sidebarOpen={sidebarOpen}
            onMenuClick={() => setSidebarOpen(true)}
            userName={studentProfile?.name}
            seasonLevel={seasonLevel}
            progressPercent={progressPercent}
            seasonName={seasonName}
            streak={streak}
            trialStatus={trialStatus}
          />

          <HomeSidebar
            open={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            currentView={currentView}
            onViewChange={handleViewChange}
            navItems={childNavItems}
            grownUpNavItems={grownUpNavItems}
            hasNewInsights={hasNewInsights}
            onParentAccess={() => {
              markAsViewed();
              handleViewChange('genitori');
            }}
            trialStatus={trialStatus}
          />
        </>
      )}

      {!isSessionActive && (
        <div
          className={cn(
            'flex gap-6 transition-all duration-300 px-4 sm:px-6 lg:px-8 pt-14 pb-6',
            sidebarOpen ? 'lg:ml-64' : 'lg:ml-20',
          )}
          ref={mainContentRef}
        >
          <main className="flex-1">
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
              {currentView === 'intent' && (
                <HomeIntentChooser userName={studentProfile?.name} onStart={handleIntentStart} />
              )}
              {currentView === 'maestri' && (
                <MaestriGrid
                  onMaestroSelect={(maestro, mode) => {
                    setSelectedMaestro(maestro);
                    setMaestroSessionMode(mode);
                    setSessionContextMessage(undefined);
                    setMaestroSessionKey((prev) => prev + 1);
                    setCurrentView('maestro-session');
                  }}
                />
              )}
              {currentView === 'astuccio' && <LazyAstuccioView onToolRequest={handleToolRequest} />}
              {currentView === 'supporti' && <LazyZainoView />}
              {currentView === 'calendar' && <LazyCalendarView />}
              {currentView === 'progress' && <LazyProgressView />}
              {currentView === 'genitori' && <LazyGenitoriView />}
              {currentView === 'settings' && <LazySettingsView />}
            </motion.div>
          </main>

          {/* Trial usage dashboard sidebar - visible only in trial mode on lg screens */}
          {trialStatus.isTrialMode && !trialStatus.isLoading && (
            <aside className="w-80 hidden lg:block flex-shrink-0">
              <TrialUsageDashboard />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
