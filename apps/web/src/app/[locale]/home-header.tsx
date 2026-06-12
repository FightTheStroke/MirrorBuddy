'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Flame, Coins, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ToolsDropdown } from '@/components/tools';
import { UserMenuDropdown } from '@/components/ui/user-menu-dropdown';

interface HomeHeaderProps {
  sidebarOpen: boolean;
  onMenuClick?: () => void;
  userName?: string;
  seasonLevel: number;
  progressPercent: number;
  seasonName: string;
  streak: { current: number };
}

export function HomeHeader({
  sidebarOpen,
  onMenuClick,
  userName,
  seasonLevel,
  progressPercent,
  seasonName,
  streak,
}: HomeHeaderProps) {
  const t = useTranslations('home');

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 transition-all duration-300',
        sidebarOpen ? 'lg:left-64' : 'lg:left-20',
      )}
    >
      {/* Greeting + Level + MirrorBucks Progress */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center h-11 w-11 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={t('header.openMenu')}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Coins className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-bold text-slate-900 dark:text-white">
              {t('lv')}
              {seasonLevel}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {seasonName}
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-0.5 w-24 sm:w-36">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats — child space keeps only the streak (simple, motivating).
          Sessions / study time / questions live in the "I miei premi" view. */}
      <div className="hidden md:flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5" title={t('header.streak')}>
          <Flame
            className={cn('w-4 h-4', streak.current > 0 ? 'text-orange-500' : 'text-slate-400')}
          />
          <span
            className={cn(
              'font-semibold',
              streak.current > 0 ? 'text-orange-500' : 'text-slate-500',
            )}
          >
            {streak.current}
          </span>
        </div>

        {/* COMP-01: the trial badge ("Prova 7/10" linking to /invite/request)
            was removed — adult/commercial jargon a 9-year-old does not parse
            (focus group FG-10) and a data-collecting CTA aimed at the child.
            Trial quota + invite live in adult contexts only ("Per i grandi"
            sidebar group and the parent area). */}
      </div>

      {/* Right section: tools dropdown + notifications + user menu */}
      <div className="hidden lg:flex items-center gap-3">
        <ToolsDropdown />
        <NotificationBell />
        <UserMenuDropdown userName={userName} />
      </div>
    </header>
  );
}
