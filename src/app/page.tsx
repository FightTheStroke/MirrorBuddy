'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Brain,
  Trophy,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Target,
  Flame,
  Network,
  Calendar,
  Heart,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { MaestriGrid } from '@/components/maestros/maestri-grid';
import { NotificationBell } from '@/components/notifications/notification-bell';
import {
  LazyQuizView,
  LazyFlashcardsView,
  LazyMindmapsView,
  LazyHomeworkHelpView,
  LazyCalendarView,
  LazyHTMLSnippetsView,
} from '@/components/education';
import { CharacterChatView } from '@/components/conversation';
import { LazySettingsView } from '@/components/settings';
import { LazyProgressView, HomeProgressWidget } from '@/components/progress';
import { Button } from '@/components/ui/button';
import { useProgressStore, useSettingsStore } from '@/lib/stores/app-store';
import { cn } from '@/lib/utils';

type View = 'coach' | 'buddy' | 'maestri' | 'quiz' | 'flashcards' | 'mindmaps' | 'homework' | 'calendar' | 'demos' | 'progress' | 'settings';

// Character info for sidebar display
const COACH_INFO = {
  melissa: { name: 'Melissa', avatar: '/avatars/melissa.jpg' },
  roberto: { name: 'Roberto', avatar: '/avatars/roberto.png' },
} as const;

const BUDDY_INFO = {
  mario: { name: 'Mario', avatar: '/avatars/mario.jpg' },
  faty: { name: 'Faty', avatar: '/avatars/faty.png' },
} as const;

export default function Home() {
  // Start with Maestri as the first view
  const [currentView, setCurrentView] = useState<View>('maestri');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { xp, level, streak } = useProgressStore();
  const { studentProfile } = useSettingsStore();

  // Get selected coach and buddy from preferences (with defaults)
  const selectedCoach = studentProfile?.preferredCoach || 'melissa';
  const selectedBuddy = studentProfile?.preferredBuddy || 'mario';
  const coachInfo = COACH_INFO[selectedCoach];
  const buddyInfo = BUDDY_INFO[selectedBuddy];

  const navItems = [
    { id: 'coach' as const, label: coachInfo.name, icon: Sparkles, isChat: true, avatar: coachInfo.avatar },
    { id: 'buddy' as const, label: buddyInfo.name, icon: Heart, isChat: true, avatar: buddyInfo.avatar },
    { id: 'maestri' as const, label: 'Maestri', icon: GraduationCap },
    { id: 'quiz' as const, label: 'Quiz', icon: Brain },
    { id: 'flashcards' as const, label: 'Flashcards', icon: BookOpen },
    { id: 'mindmaps' as const, label: 'Mappe Mentali', icon: Network },
    { id: 'homework' as const, label: 'Materiali', icon: Target },
    { id: 'calendar' as const, label: 'Calendario', icon: Calendar },
    { id: 'demos' as const, label: 'Demo', icon: Brain },
    { id: 'progress' as const, label: 'Progressi', icon: Trophy },
    { id: 'settings' as const, label: 'Impostazioni', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      {/* Header with notifications and version */}
      <div className="fixed top-2 right-3 z-50 flex items-center gap-3">
        <NotificationBell />
        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
          v{process.env.APP_VERSION}
        </span>
      </div>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo - clickable to return home */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setCurrentView('maestri')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            aria-label="Torna alla home"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src="/icon.png"
                alt="Convergio"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                Convergio-Edu
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

        {/* Quick stats */}
        {sidebarOpen && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                <Flame className="h-5 w-5 text-orange-500 mb-1" />
                <p className="text-2xl font-bold text-orange-600">{streak.current}</p>
                <p className="text-xs text-orange-600/80">Streak</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <TrendingUp className="h-5 w-5 text-blue-500 mb-1" />
                <p className="text-2xl font-bold text-blue-600">{level}</p>
                <p className="text-xs text-blue-600/80">Level</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation - with bottom padding for XP bar */}
        <nav className="p-4 space-y-2 overflow-y-auto pb-24" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {navItems.map((item) => {
            const isChatItem = item.id === 'coach' || item.id === 'buddy';
            const avatarSrc = 'avatar' in item ? item.avatar : null;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
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
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                )}
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* XP Progress */}
        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">XP</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {xp.toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <motion.div
                className="h-full bg-accent-themed"
                initial={{ width: 0 }}
                animate={{ width: `${(xp % 1000) / 10}%` }}
              />
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 p-8',
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
            <>
              <HomeProgressWidget />
              <MaestriGrid />
            </>
          )}

          {currentView === 'quiz' && <LazyQuizView />}

          {currentView === 'flashcards' && <LazyFlashcardsView />}

          {currentView === 'mindmaps' && <LazyMindmapsView />}

          {currentView === 'homework' && <LazyHomeworkHelpView />}

          {currentView === 'calendar' && <LazyCalendarView />}

          {currentView === 'demos' && <LazyHTMLSnippetsView />}

          {currentView === 'progress' && <LazyProgressView />}

          {currentView === 'settings' && <LazySettingsView />}
        </motion.div>
      </main>
    </div>
  );
}
