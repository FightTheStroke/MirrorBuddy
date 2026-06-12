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
import { useAccessibilityStore } from '@/lib/accessibility';
import { getUserIdFromCookie } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { Maestro, ToolType } from '@/types';
import { MaestriGrid } from '@/components/maestros/maestri-grid';
import { LazyCalendarView, LazyGenitoriView } from '@/components/education';
import { LazySettingsView } from '@/components/settings';
import { LazyProgressView } from '@/components/progress';
import { TrialUsageDashboard } from '@/components/trial';
import { HomeHeader } from './home-header';
import { HomeSidebar } from './home-sidebar';
import { HomeIntentChooser, type IntentStart } from './home-intent-chooser';
import type { View, MaestroSessionMode, Intent } from './types';
import { LazyMaestroSession, LazyZainoView, HomeShellSkeleton } from './home-lazy';

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
  // Start collapsed on narrow viewports (incl. 200% zoom ≈ 640px CSS) so the
  // fixed sidebar never overlays the home content on first paint. SSR has no
  // window → defaults open (desktop-first markup); the lazy initializer + the
  // resize effect below reconcile to the real width on the client. (FG-01/FG-02:
  // a low-vision child at 200% zoom saw the sidebar covering the intent cards.)
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 1024,
  );
  const [selectedMaestro, setSelectedMaestro] = useState<Maestro | null>(null);
  const [maestroSessionMode, setMaestroSessionMode] = useState<MaestroSessionMode>('voice');
  const [maestroSessionKey, setMaestroSessionKey] = useState(0);
  const [requestedToolType, setRequestedToolType] = useState<ToolType | undefined>(undefined);
  const [sessionContextMessage, setSessionContextMessage] = useState<string | undefined>(undefined);
  // UX-01: the intent + subject that opened the session, for the child-first
  // handoff banner ("Buddy ti ha portato dal Prof X"). undefined when a session
  // is opened directly from the grown-ups Maestri grid (no handoff to explain).
  const [sessionIntent, setSessionIntent] = useState<Intent | undefined>(undefined);
  const [sessionSubjectLabel, setSessionSubjectLabel] = useState<string | undefined>(undefined);

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
  // A11Y-05: ADHD/autism profiles set distractionFreeMode. In the child (student)
  // space this hides non-essential promo surfaces (trial banner, usage dashboard,
  // trial toasts) so the only thing on screen is the learning flow.
  const distractionFreeMode = useAccessibilityStore((state) => state.settings.distractionFreeMode);
  // COMP-01: the home IS the child space, so trial toasts are ALWAYS child-safe
  // here (no promo welcome, no upsell, exhaustion = "ask a grown-up") —
  // independent of distractionFreeMode, which remains an extra layer on top.
  useTrialToasts(trialStatus, { suppress: distractionFreeMode, childSafe: true });
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

  // Intention-based entry: each intent resolves to a Maestro (auto-selected by
  // subject) and opens a session pre-framed with a context message. The
  // student never picks a professor from the 26-Maestri grid.
  const handleIntentStart = (start: IntentStart) => {
    setSelectedMaestro(start.maestro);
    setMaestroSessionMode(start.mode);
    setRequestedToolType(start.requestedToolType);
    setSessionContextMessage(start.contextMessage);
    setSessionIntent(start.intent);
    setSessionSubjectLabel(start.subjectLabel);
    setMaestroSessionKey((prev) => prev + 1);
    setCurrentView('maestro-session');
  };

  if (!isHydrated || !hasCompletedOnboarding) {
    return <HomeShellSkeleton title={t('appTitle')} />;
  }

  const mbInLevel = seasonMirrorBucks % MB_PER_LEVEL;
  const progressPercent = Math.min(100, (mbInLevel / MB_PER_LEVEL) * 100);
  const seasonName = currentSeason?.name || t('seasonDefault');

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

  const isSessionActive = currentView === 'maestro-session';

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
              setSessionIntent(undefined);
              setSessionSubjectLabel(undefined);
            }}
            initialMode={maestroSessionMode}
            requestedToolType={requestedToolType}
            contextMessage={sessionContextMessage}
            intent={sessionIntent}
            subjectLabel={sessionSubjectLabel}
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
            {/* COMP-01: the trial promo banner (quota bar + "request access" CTA
                → /invite/request) was removed from the child home. Commercial /
                account surfaces must never target the student; the adult sees
                trial usage in the parent area (genitori view) instead. */}
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
                    // Grid (grown-ups) entry: no intent handoff to explain.
                    setSessionIntent(undefined);
                    setSessionSubjectLabel(undefined);
                    setMaestroSessionKey((prev) => prev + 1);
                    setCurrentView('maestro-session');
                  }}
                />
              )}
              {currentView === 'supporti' && <LazyZainoView />}
              {currentView === 'calendar' && <LazyCalendarView />}
              {currentView === 'progress' && <LazyProgressView />}
              {currentView === 'genitori' && <LazyGenitoriView />}
              {currentView === 'settings' && <LazySettingsView />}
            </motion.div>
          </main>

          {/* COMP-01: trial usage (quotas, percentages, invite CTA) is an ADULT
              account surface. It renders ONLY next to the parent area (genitori
              view) — never alongside the child learning flow — regardless of
              distractionFreeMode, which is an accessibility extra, not the
              barrier that keeps commercial surfaces away from the child. */}
          {trialStatus.isTrialMode && !trialStatus.isLoading && currentView === 'genitori' && (
            <aside className="w-80 hidden lg:block flex-shrink-0">
              <TrialUsageDashboard />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
