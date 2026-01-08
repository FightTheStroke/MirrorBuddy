'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import {
  GraduationCap,
  Trophy,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Flame,
  Calendar,
  Heart,
  Sparkles,
  Clock,
  Star,
  Users,
  Pencil,
  Backpack,
  Coins,
  BookOpen,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import Image from 'next/image';
import { MaestriGrid } from '@/components/maestros/maestri-grid';
import { MaestroSession } from '@/components/maestros/maestro-session';
import type { Maestro } from '@/types';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { PomodoroHeaderWidget } from '@/components/pomodoro';
import { AmbientAudioHeaderWidget } from '@/components/ambient-audio';
import {
  LazyCalendarView,
  LazyGenitoriView,
} from '@/components/education';
import { ZainoView } from '@/app/supporti/components/zaino-view';
import { AstuccioView } from '@/app/astuccio/components/astuccio-view';
import { CharacterChatView, ActiveMaestroAvatar } from '@/components/conversation';
import { LazySettingsView } from '@/components/settings';
import { LazyProgressView } from '@/components/progress';
import { Button } from '@/components/ui/button';
import { useProgressStore, useSettingsStore, useUIStore } from '@/lib/stores';
import { useConversationFlowStore } from '@/lib/stores/conversation-flow-store';
import { FocusToolLayout } from '@/components/tools/focus-tool-layout';
import { useParentInsightsIndicator } from '@/lib/hooks/use-parent-insights-indicator';
import { cn } from '@/lib/utils';

// Simplified views: removed quiz, flashcards, mindmaps, summaries, homework, demos, archivio, zaino
// These are now accessed via Supporti (browse) or Astuccio (create)
type View = 'coach' | 'buddy' | 'maestri' | 'maestro-session' | 'astuccio' | 'supporti' | 'calendar' | 'progress' | 'genitori' | 'settings';
type MaestroSessionMode = 'voice' | 'chat';

// Character info for sidebar display
const COACH_INFO = {
  melissa: { name: 'Melissa', avatar: '/avatars/melissa.jpg' },
  roberto: { name: 'Roberto', avatar: '/avatars/roberto.png' },
  chiara: { name: 'Chiara', avatar: '/avatars/chiara.png' },
  andrea: { name: 'Andrea', avatar: '/avatars/andrea.png' },
  favij: { name: 'Favij', avatar: '/avatars/favij.jpg' },
} as const;

const BUDDY_INFO = {
  mario: { name: 'Mario', avatar: '/avatars/mario.jpg' },
  noemi: { name: 'Noemi', avatar: '/avatars/noemi.png' },
  enea: { name: 'Enea', avatar: '/avatars/enea.png' },
  bruno: { name: 'Bruno', avatar: '/avatars/bruno.png' },
  sofia: { name: 'Sofia', avatar: '/avatars/sofia.png' },
} as const;

// DEBUG: Tutte le pagine del progetto
type DebugPage = {
  href: string;
  note: string;
  status?: 'ok' | 'dead' | 'redirect' | 'inline';
  external?: boolean;
};

const debugPages: DebugPage[] = [
  // PAGINE PRINCIPALI (visibili nella sidebar)
  { href: '/', note: 'Home - I Professori' },
  { href: '/supporti', note: 'Zaino - materiali salvati', status: 'ok' },
  
  // PAGINE NON COLLEGATE (potenzialmente da rimuovere)
  { href: '/welcome', note: 'Onboarding' },
  { href: '/landing', note: 'Marketing page' },
  { href: '/study-kit', note: 'Study Kit' },
  { href: '/parent-dashboard', note: 'Dashboard genitori standalone' },
  { href: '/materiali', note: 'HomeworkHelpView' },
  
  // SHOWCASE
  { href: '/showcase', note: 'Showcase home' },
  { href: '/showcase/maestri', note: 'Showcase - Professori' },
  { href: '/showcase/accessibility', note: 'Showcase - Accessibilita' },
  
  // TEST
  { href: '/test-voice', note: 'Test voice' },
  { href: '/test-audio', note: 'Test audio' },
  
  // ADMIN
  { href: '/admin/analytics', note: 'Analytics admin' },
];

export default function Home() {
  const router = useRouter();
  const { hasCompletedOnboarding, isHydrated, hydrateFromApi } = useOnboardingStore();

  // Hydrate onboarding state from DB on mount
  useEffect(() => {
    hydrateFromApi();
  }, [hydrateFromApi]);

  // Redirect to welcome if onboarding not completed (only after hydration)
  useEffect(() => {
    if (isHydrated && !hasCompletedOnboarding) {
      router.push('/welcome');
    }
  }, [isHydrated, hasCompletedOnboarding, router]);

  // Start with Maestri as the first view
  const [currentView, setCurrentView] = useState<View>('maestri');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [debugMenuOpen, setDebugMenuOpen] = useState(false);

  // Auto-compress sidebar when window is too narrow
  useEffect(() => {
    const handleResize = () => {
      // Compress sidebar if window width is less than 1024px (lg breakpoint)
      // This ensures enough space for the main content
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    // Check on mount
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Maestro session state
  const [selectedMaestro, setSelectedMaestro] = useState<Maestro | null>(null);
  const [maestroSessionMode, setMaestroSessionMode] = useState<MaestroSessionMode>('voice');
  const [maestroSessionKey, setMaestroSessionKey] = useState(0);

  const {
    mirrorBucks: _mirrorBucks, // All-time (not shown, season takes priority)
    seasonMirrorBucks,
    seasonLevel,
    level: _level, // All-time level (not shown, season takes priority)
    currentSeason,
    streak,
    totalStudyMinutes,
    sessionsThisWeek,
    questionsAsked
  } = useProgressStore();
  const { studentProfile } = useSettingsStore();
  const { hasNewInsights, markAsViewed } = useParentInsightsIndicator();
  const { focusMode } = useUIStore();
  const {
    activeCharacter,
    conversationsByCharacter,
    endConversationWithSummary,
    isActive: isConversationActive
  } = useConversationFlowStore();

  // Handler to close active conversation before navigating to a different view
  const handleViewChange = async (newView: View) => {
    // If there's an active conversation, close it first
    if (isConversationActive && activeCharacter) {
      const characterConvo = conversationsByCharacter[activeCharacter.id];
      if (characterConvo?.conversationId) {
        const userId = sessionStorage.getItem('mirrorbuddy-user-id');
        if (userId) {
          try {
            await endConversationWithSummary(characterConvo.conversationId, userId);
          } catch (error) {
            console.error('Failed to close conversation:', error);
          }
        }
      }
    }
    setCurrentView(newView);
  };

  // Don't render main app until hydration is done and onboarding is completed
  if (!isHydrated || !hasCompletedOnboarding) {
    return null;
  }

  // MirrorBucks calculations (100 levels per season, 1000 MB per level)
  const MB_PER_LEVEL = 1000;
  const mbInLevel = seasonMirrorBucks % MB_PER_LEVEL;
  const mbNeeded = MB_PER_LEVEL;
  const progressPercent = Math.min(100, (mbInLevel / mbNeeded) * 100);
  const seasonName = currentSeason?.name || 'Autunno';

  // Format study time
  const hours = Math.floor(totalStudyMinutes / 60);
  const minutes = totalStudyMinutes % 60;
  const studyTimeStr = hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;

  // Get selected coach and buddy from preferences (with defaults)
  const selectedCoach = studentProfile?.preferredCoach || 'melissa';
  const selectedBuddy = studentProfile?.preferredBuddy || 'mario';
  const coachInfo = COACH_INFO[selectedCoach];
  const buddyInfo = BUDDY_INFO[selectedBuddy];

  // Simplified navigation: Zaino = archive, Astuccio = tools hub
  const navItems = [
    { id: 'coach' as const, label: coachInfo.name, icon: Sparkles, isChat: true, avatar: coachInfo.avatar },
    { id: 'buddy' as const, label: buddyInfo.name, icon: Heart, isChat: true, avatar: buddyInfo.avatar },
    { id: 'maestri' as const, label: 'Professori', icon: GraduationCap },
    { id: 'astuccio' as const, label: 'Astuccio', icon: Pencil },     // Tools hub (create)
    { id: 'supporti' as const, label: 'Zaino', icon: Backpack },         // Materials archive (browse)
    { id: 'calendar' as const, label: 'Calendario', icon: Calendar },
    { id: 'progress' as const, label: 'Progressi', icon: Trophy },
    { id: 'settings' as const, label: 'Impostazioni', icon: Settings },
    // 'genitori' accessed via Parent Access button at sidebar bottom
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      {/* Unified Header Bar */}
      <header
        className={cn(
          'fixed top-0 right-0 h-14 z-50 flex items-center justify-between px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 transition-all duration-300',
          sidebarOpen ? 'left-64' : 'left-20'
        )}
      >
        {/* Level + MirrorBucks Progress */}
        <div className="flex items-center gap-3 min-w-[240px]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Coins className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-bold text-slate-900 dark:text-white">Lv.{seasonLevel}</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{seasonName}</span>
              <span className="text-xs text-slate-500">{mbInLevel}/{mbNeeded} MB</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-0.5 w-36">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5" title="Streak">
            <Flame className={cn("w-4 h-4", streak.current > 0 ? "text-orange-500" : "text-slate-400")} />
            <span className={cn("font-semibold", streak.current > 0 ? "text-orange-500" : "text-slate-500")}>
              {streak.current}
            </span>
          </div>

          <div className="flex items-center gap-1.5" title="Sessioni questa settimana">
            <BookOpen className="w-4 h-4 text-accent-themed" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{sessionsThisWeek}</span>
          </div>

          <div className="flex items-center gap-1.5" title="Tempo di studio">
            <Clock className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{studyTimeStr}</span>
          </div>

          <div className="flex items-center gap-1.5" title="Domande fatte">
            <Star className="w-4 h-4 text-purple-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{questionsAsked}</span>
          </div>

          {/* Streak bonus badge */}
          {streak.current >= 3 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium">
              <Flame className="w-3 h-3" />
              +{Math.min(streak.current * 10, 50)}% MB
            </div>
          )}
        </div>

        {/* Right section: ambient audio + pomodoro + notifications + version */}
        <div className="flex items-center gap-3">
          <AmbientAudioHeaderWidget />
          <PomodoroHeaderWidget />
          <NotificationBell />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            v{process.env.APP_VERSION}
          </span>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo - clickable to return home */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setCurrentView('maestri')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            aria-label="Torna alla home"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src="/logo-brain.png"
                alt="MirrorBuddy"
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                MirrorBuddy
              </span>
            )}
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-500"
            aria-label={sidebarOpen ? 'Chiudi menu' : 'Apri menu'}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation - with bottom padding for XP bar */}
        <nav className="p-4 space-y-2 overflow-y-auto pb-24" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {navItems.map((item) => {
            const isChatItem = item.id === 'coach' || item.id === 'buddy';
            const avatarSrc = 'avatar' in item ? item.avatar : null;

            return (
              <button
                key={item.id}
                onClick={async () => {
                  await handleViewChange(item.id);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  currentView === item.id
                    ? 'bg-accent-themed text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                  isChatItem && 'relative'
                )}
                style={currentView === item.id ? { boxShadow: '0 10px 15px -3px var(--accent-color, #3b82f6)40' } : undefined}
              >
                {avatarSrc ? (
                  <div className="relative flex-shrink-0">
                    <Image
                      src={avatarSrc}
                      alt={item.label}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white dark:border-slate-900 rounded-full" />
                  </div>
                ) : (
                  <div className="relative flex-shrink-0">
                    <item.icon className="h-5 w-5" />
                  </div>
                )}
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* DEBUG MENU - Tutte le pagine */}
        <div className="px-2 pb-2">
          <button
            onClick={() => setDebugMenuOpen(!debugMenuOpen)}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs',
              debugMenuOpen
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            <span className="font-bold">DEBUG MENU</span>
            {debugMenuOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {debugMenuOpen && (
            <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
              <div className="text-xs text-slate-400 mb-2 font-bold">TUTTE LE PAGINE (usa NUMERO per riferirti):</div>
              {debugPages.map((page, idx) => {
                const isInline = page.href.startsWith('inline:');
                const isRedirect = page.status === 'redirect';
                const isDead = page.status === 'dead';
                const isInlineStatus = page.status === 'inline';
                
                return isInline ? (
                  <div
                    key={page.href}
                    className={cn(
                      'block px-2 py-1.5 rounded-lg text-xs mb-1',
                      isInlineStatus
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    )}
                  >
                    <span className="font-bold">[{idx + 1}] {page.href}</span>
                    {page.note && <span className="ml-2 opacity-75">- {page.note}</span>}
                  </div>
                ) : (
                  <a
                    key={page.href}
                    href={page.href}
                    target="_self"
                    className={cn(
                      'block px-2 py-1.5 rounded-lg text-xs mb-1 transition-colors',
                      isDead
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                        : isRedirect
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    )}
                  >
                    <span className="font-bold">[{idx + 1}] {page.href}</span>
                    {page.note && <span className="ml-2 opacity-75">- {page.note}</span>}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Maestro Avatar - shows during conversation */}
        <div className="px-4 mb-2">
          <ActiveMaestroAvatar
            onReturnToMaestro={() => setCurrentView('maestro-session')}
          />
        </div>

        {/* Parent Access Button - replaces old XP bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => {
              markAsViewed();
              handleViewChange('genitori');
            }}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'px-4 py-2.5 rounded-xl',
              'bg-indigo-100 dark:bg-indigo-900/40',
              'hover:bg-indigo-200 dark:hover:bg-indigo-800/50',
              'border border-indigo-200 dark:border-indigo-700',
              'text-indigo-700 dark:text-indigo-300',
              'text-sm font-medium',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
              'relative'
            )}
          >
            <div className="relative">
              <Users className="w-4 h-4" />
              {hasNewInsights && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            {sidebarOpen && <span>Area Genitori</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 p-8 pt-20',
          sidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >

        {/* View content */}
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {currentView === 'coach' && (
            <CharacterChatView characterId={selectedCoach} characterType="coach" />
          )}

          {currentView === 'buddy' && (
            <CharacterChatView characterId={selectedBuddy} characterType="buddy" />
          )}

          {currentView === 'maestri' && (
            <MaestriGrid
              onMaestroSelect={(maestro, mode) => {
                setSelectedMaestro(maestro);
                setMaestroSessionMode(mode);
                setMaestroSessionKey(prev => prev + 1);
                setCurrentView('maestro-session');
              }}
            />
          )}

          {currentView === 'maestro-session' && selectedMaestro && (
            <MaestroSession
              key={`maestro-${selectedMaestro.id}-${maestroSessionKey}`}
              maestro={selectedMaestro}
              onClose={() => setCurrentView('maestri')}
              initialMode={maestroSessionMode}
            />
          )}

          {currentView === 'astuccio' && <AstuccioView />}

          {currentView === 'supporti' && <ZainoView />}

          {currentView === 'calendar' && <LazyCalendarView />}

          {currentView === 'progress' && <LazyProgressView />}

          {currentView === 'genitori' && <LazyGenitoriView />}

          {currentView === 'settings' && <LazySettingsView />}
        </motion.div>
      </main>

      {/* Focus Mode Overlay - renders above everything when active */}
      {focusMode && <FocusToolLayout />}
    </div>
  );
}
