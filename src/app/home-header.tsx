"use client";

import { motion } from "framer-motion";
import { Flame, Coins, BookOpen, Clock, Star, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PomodoroHeaderWidget } from "@/components/pomodoro";
import { AmbientAudioHeaderWidget } from "@/components/ambient-audio";
import { CalculatorHeaderWidget } from "@/components/calculator";
import { TierBadge } from "@/components/tier/TierBadge";
import { TrialHeaderDropdown } from "@/components/trial";
import type { TierName } from "@/types/tier-types";

interface TrialStatus {
  isTrialMode: boolean;
  chatsUsed: number;
  chatsRemaining: number;
  maxChats: number;
}

interface HomeHeaderProps {
  sidebarOpen: boolean;
  onMenuClick?: () => void;
  seasonLevel: number;
  mbInLevel: number;
  mbNeeded: number;
  progressPercent: number;
  seasonName: string;
  streak: { current: number };
  sessionsThisWeek: number;
  totalStudyMinutes: number;
  questionsAsked: number;
  trialStatus?: TrialStatus;
  userTier?: TierName;
  isSimulatedTier?: boolean;
}

export function HomeHeader({
  sidebarOpen,
  onMenuClick,
  seasonLevel,
  mbInLevel,
  mbNeeded,
  progressPercent,
  seasonName,
  streak,
  sessionsThisWeek,
  totalStudyMinutes,
  questionsAsked,
  trialStatus,
  userTier,
  isSimulatedTier,
}: HomeHeaderProps) {
  const hours = Math.floor(totalStudyMinutes / 60);
  const minutes = totalStudyMinutes % 60;
  const studyTimeStr = hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-14 z-50 flex items-center justify-between px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 transition-all duration-300",
        sidebarOpen ? "lg:left-64" : "lg:left-20",
      )}
    >
      {/* Level + MirrorBucks Progress */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center h-11 w-11 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Apri menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Coins className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-bold text-slate-900 dark:text-white">
              Lv.{seasonLevel}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {seasonName}
            </span>
            <span className="text-xs text-slate-500">
              {mbInLevel}/{mbNeeded} MB
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-0.5 w-full xs:w-28 sm:w-36 md:w-40">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Stats - Compact version for small screens */}
      <div className="flex md:hidden items-center gap-2 text-sm">
        {/* Streak indicator */}
        {streak.current > 0 && (
          <div className="flex items-center gap-1" title="Streak">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-orange-500 text-xs">
              {streak.current}
            </span>
          </div>
        )}

        {/* Trial mode badge - mobile version */}
        {trialStatus?.isTrialMode && (
          <Link
            href="/invite/request"
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
              trialStatus.chatsRemaining <= 3
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
            )}
            title="Clicca per richiedere accesso completo"
          >
            <MessageCircle className="w-3 h-3" />
            <span className="font-semibold">
              {trialStatus.chatsRemaining}/{trialStatus.maxChats}
            </span>
          </Link>
        )}

        {/* Notifications bell - mobile */}
        <NotificationBell />
      </div>

      {/* Desktop Stats - Full version for medium screens and up */}
      <div className="hidden md:flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5" title="Streak">
          <Flame
            className={cn(
              "w-4 h-4",
              streak.current > 0 ? "text-orange-500" : "text-slate-400",
            )}
          />
          <span
            className={cn(
              "font-semibold",
              streak.current > 0 ? "text-orange-500" : "text-slate-500",
            )}
          >
            {streak.current}
          </span>
        </div>

        <div
          className="flex items-center gap-1.5"
          title="Sessioni questa settimana"
        >
          <BookOpen className="w-4 h-4 text-accent-themed" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {sessionsThisWeek}
          </span>
        </div>

        <div className="flex items-center gap-1.5" title="Tempo di studio">
          <Clock className="w-4 h-4 text-green-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {studyTimeStr}
          </span>
        </div>

        <div className="flex items-center gap-1.5" title="Domande fatte">
          <Star className="w-4 h-4 text-purple-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {questionsAsked}
          </span>
        </div>

        {/* Streak bonus badge */}
        {streak.current >= 3 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium">
            <Flame className="w-3 h-3" />+{Math.min(streak.current * 10, 50)}%
            MB
          </div>
        )}

        {/* Trial mode dropdown */}
        {trialStatus?.isTrialMode && (
          <TrialHeaderDropdown
            chatsRemaining={trialStatus.chatsRemaining}
            maxChats={trialStatus.maxChats}
          />
        )}
      </div>

      {/* Right section: tier badge + calculator + ambient audio + pomodoro + notifications + version */}
      <div className="hidden lg:flex items-center gap-3">
        {userTier && (
          <div className="flex items-center gap-1">
            <TierBadge tier={userTier} showIcon={userTier === "pro"} />
            {isSimulatedTier && (
              <span className="text-[10px] text-amber-500 font-medium">
                (SIM)
              </span>
            )}
          </div>
        )}
        <CalculatorHeaderWidget />
        <AmbientAudioHeaderWidget />
        <PomodoroHeaderWidget />
        <NotificationBell />
        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
          v{process.env.APP_VERSION}
        </span>
      </div>
    </header>
  );
}
