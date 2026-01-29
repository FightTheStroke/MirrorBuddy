"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Flame,
  Coins,
  BookOpen,
  Clock,
  Star,
  Gift,
  MessageCircle,
  Menu,
  WifiOff,
  CloudUpload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PomodoroHeaderWidget } from "@/components/pomodoro";
import { AmbientAudioHeaderWidget } from "@/components/ambient-audio";
import { CalculatorHeaderWidget } from "@/components/calculator";
import { juice, CELEBRATION_TYPES } from "@/lib/utils/juice-effects";

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
}: HomeHeaderProps) {
  const t = useTranslations("home");
  const prevLevelRef = useRef(seasonLevel);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Trigger JUICE effect on Level Up
  useEffect(() => {
    if (seasonLevel > prevLevelRef.current) {
      juice.trigger(CELEBRATION_TYPES.LEVEL_UP, { newLevel: seasonLevel });
      prevLevelRef.current = seasonLevel;
    }
  }, [seasonLevel]);

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
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center h-11 w-11 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={t("header.openMenu")}
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {/* Connection Status Indicator */}
        {!isOnline ? (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-[10px] font-bold uppercase tracking-wider animate-pulse">
            <WifiOff className="w-3 h-3" /> Offline
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg font-bold">
            <Coins className="w-4 h-4 text-white" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-bold text-slate-900 dark:text-white">
              Lv.{seasonLevel}
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

      <div className="hidden md:flex items-center gap-4 text-sm">
        {/* ... (existing stats) */}
        <div className="flex items-center gap-1.5" title={t("header.streak")}>
          <Flame className={cn("w-4 h-4", streak.current > 0 ? "text-orange-500" : "text-slate-400")} />
          <span className={cn("font-semibold", streak.current > 0 ? "text-orange-500" : "text-slate-500")}>
            {streak.current}
          </span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-3">
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