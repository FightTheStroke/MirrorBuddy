"use client";

import Link from "next/link";
import { ChevronUp, ChevronDown, LogIn, UserPlus, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActiveMaestroAvatar } from "@/components/conversation";
import { TrialStatusIndicator } from "@/components/trial";
import { useAdminStatus } from "@/lib/hooks/use-admin-status";
import type { View } from "@/app/types";

interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
  isChat?: boolean;
  avatar?: string;
}

interface TrialStatus {
  isTrialMode: boolean;
  chatsUsed: number;
  chatsRemaining: number;
  maxChats: number;
  voiceSecondsUsed: number;
  voiceSecondsRemaining: number;
  maxVoiceSeconds: number;
  toolsUsed: number;
  toolsRemaining: number;
  maxTools: number;
}

interface HomeSidebarProps {
  open: boolean;
  onToggle: () => void;
  currentView: View;
  onViewChange: (view: View) => Promise<void>;
  navItems: NavItem[];
  hasNewInsights: boolean;
  onParentAccess: () => void;
  trialStatus?: TrialStatus;
}

export function HomeSidebar({
  open,
  onToggle,
  currentView,
  onViewChange,
  navItems,
  hasNewInsights,
  onParentAccess,
  trialStatus,
}: HomeSidebarProps) {
  const { isAdmin } = useAdminStatus();
  const handleViewChange = async (view: View) => {
    await onViewChange(view);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      onToggle();
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transition-all duration-300",
          "w-72 max-w-[85vw] lg:max-w-none lg:w-64",
          open
            ? "translate-x-0 lg:w-64"
            : "-translate-x-full lg:translate-x-0 lg:w-20",
        )}
      >
      {/* Logo - clickable to return home */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => handleViewChange("maestri")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          aria-label="Torna alla home"
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
            <Image
              src="/logo-brain.png"
              alt="MirrorBuddy"
              width={36}
              height={36}
              className="object-cover"
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          {open && (
            <span className="font-bold text-lg text-slate-900 dark:text-white">
              MirrorBuddy
            </span>
          )}
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-slate-500"
          aria-label={open ? "Chiudi menu" : "Apri menu"}
        >
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Trial Status Indicator */}
      {trialStatus?.isTrialMode && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            {open && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Modalità Prova
              </span>
            )}
            <TrialStatusIndicator
              chatsUsed={trialStatus.chatsUsed}
              maxChats={trialStatus.maxChats}
              voiceSecondsUsed={trialStatus.voiceSecondsUsed}
              maxVoiceSeconds={trialStatus.maxVoiceSeconds}
              toolsUsed={trialStatus.toolsUsed}
              maxTools={trialStatus.maxTools}
              showVoice={true}
              showTools={true}
              className={cn(!open && "justify-center")}
            />
            {open && (
              <div className="flex flex-col gap-1 mt-2">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                  >
                    <LogIn className="w-3 h-3 mr-2" />
                    Accedi
                  </Button>
                </Link>
                <Link href="/invite/request">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-purple-600 dark:text-purple-400"
                  >
                    <UserPlus className="w-3 h-3 mr-2" />
                    Richiedi accesso
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="p-4 space-y-2 overflow-y-auto pb-24"
        style={{ maxHeight: "calc(100vh - 120px)" }}
      >
        {navItems.map((item) => {
          const isChatItem = item.id === "coach" || item.id === "buddy";
          const avatarSrc = "avatar" in item ? item.avatar : null;

          const isActive = currentView === item.id;
          const isCollapsed = !open;

          return (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl transition-all",
                // Collapsed: center content, minimal padding
                isCollapsed ? "justify-center px-2 py-2" : "px-4 py-3",
                // Active state: full background only when expanded
                isActive &&
                  !isCollapsed &&
                  "bg-accent-themed text-white shadow-lg",
                // Inactive state
                !isActive &&
                  "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
                isChatItem && "relative",
              )}
              style={
                isActive && !isCollapsed
                  ? {
                      boxShadow:
                        "0 10px 15px -3px var(--accent-color, #3b82f6)40",
                    }
                  : undefined
              }
            >
              {avatarSrc ? (
                <div
                  className={cn(
                    "relative flex-shrink-0 rounded-full",
                    // When collapsed and active, add accent ring around avatar
                    isCollapsed &&
                      isActive &&
                      "ring-[3px] ring-accent-themed ring-offset-2 ring-offset-white dark:ring-offset-slate-900",
                  )}
                >
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
                <div
                  className={cn(
                    "relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    // When collapsed and active, add accent ring around icon (circular)
                    isCollapsed &&
                      isActive &&
                      "ring-[3px] ring-accent-themed ring-offset-2 ring-offset-white dark:ring-offset-slate-900 bg-accent-themed/10",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      isCollapsed && isActive && "text-accent-themed",
                    )}
                  />
                </div>
              )}
              {open && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Active Maestro Avatar */}
      <div className="px-4 mb-2">
        <ActiveMaestroAvatar
          onReturnToMaestro={() => handleViewChange("maestro-session")}
        />
      </div>

      {/* Bottom Buttons */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        {/* Admin Access Button - only visible to admins */}
        {isAdmin && (
          <Link href="/admin">
            <button
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
                "bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50",
                "border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300",
                "text-sm font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2",
              )}
              aria-label="Dashboard amministratore"
            >
              <Shield className="w-4 h-4" />
              {open && <span>Admin Dashboard</span>}
            </button>
          </Link>
        )}

        {/* Parent Access Button */}
        <button
          onClick={onParentAccess}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
            "bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-800/50",
            "border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300",
            "text-sm font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
            "relative",
          )}
        >
          <span className="relative">
            👥
            {hasNewInsights && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </span>
          {open && <span>Area Genitori</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
