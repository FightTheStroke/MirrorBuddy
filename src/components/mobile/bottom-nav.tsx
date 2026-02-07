/**
 * BottomNav Component - Mobile Bottom Navigation Bar
 *
 * Requirement: F-10 - Mobile navigation with 6 items
 * - Fixed bottom navigation bar visible only on mobile (<640px)
 * - 6 navigation items: Home, Chat, Tools (Astuccio), Achievements, Settings, Profile
 * - Icons from lucide-react (Home, MessageSquare, Briefcase, Trophy, Settings, User)
 * - Active state indicator based on current pathname
 * - Touch targets 44px minimum (accessibility)
 * - Safe area bottom padding for iOS
 */

"use client";

import {
  Home,
  MessageSquare,
  Briefcase,
  Trophy,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/astuccio", icon: Briefcase, label: "Tools" },
  { href: "/achievements", icon: Trophy, label: "Achievements" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/profile", icon: User, label: "Profile" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white dark:bg-slate-900 border-t pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-14">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive =
            pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
