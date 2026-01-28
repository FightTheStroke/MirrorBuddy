"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronUp, ChevronDown, LogOut, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActiveMaestroAvatar } from "@/components/conversation";
import { useAdminStatus } from "@/lib/hooks/use-admin-status";
import type { View } from "@/app/types";
import { LogoBrain } from "@/components/branding/logo-brain";

interface NavItem {
  id: View;
  label: string;
  icon: LucideIcon;
  isChat?: boolean;
  avatar?: string;
}

interface HomeSidebarProps {
  open: boolean;
  onToggle: () => void;
  currentView: View;
  onViewChange: (view: View) => Promise<void>;
  navItems: NavItem[];
  hasNewInsights: boolean;
  onParentAccess: () => void;
  isTrialMode?: boolean;
}

export function HomeSidebar({
  open,
  onToggle,
  currentView,
  onViewChange,
  navItems,
  hasNewInsights,
  onParentAccess,
  isTrialMode,
}: HomeSidebarProps) {
  const router = useRouter();
  const { isAdmin } = useAdminStatus();
  const t = useTranslations("home");

  const handleViewChange = async (view: View) => {
    await onViewChange(view);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      onToggle();
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/welcome");
    } catch {
      // Redirect anyway on error
      router.push("/welcome");
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
          "fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transition-all duration-300 flex flex-col",
          "w-[min(16rem,85vw)] lg:w-64",
          open
            ? "translate-x-0 lg:w-64"
            : "-translate-x-full lg:translate-x-0 lg:w-20",
        )}
      >
        {/* Logo - clickable to return home */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => handleViewChange("maestri")}
            className="flex items-center gap-3 h-11 min-w-11 hover:opacity-80 transition-opacity"
            aria-label={t("returnHome")}
          >
            <LogoBrain alt="MirrorBuddy" size={36} priority />
            {open && (
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                MirrorBuddy
              </span>
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-slate-500"
            aria-label={open ? t("closeMenu") : t("openMenu")}
          >
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
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
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
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
                aria-label={t("adminDashboard")}
              >
                <Shield className="w-4 h-4" />
                {open && <span>{t("adminDashboard")}</span>}
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
            {open && <span>{t("parentArea")}</span>}
          </button>

          {/* Logout Button - only show for authenticated users (not trial) */}
          {!isTrialMode && (
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
                "bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/40",
                "border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-700",
                "text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400",
                "text-sm font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
              )}
              aria-label={t("logout")}
            >
              <LogOut className="w-4 h-4" />
              {open && <span>{t("logout")}</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
