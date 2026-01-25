"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  BarChart3,
  FileText,
  Settings,
  Menu,
  Home,
  Activity,
  Layers,
  ScrollText,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  badgeColor?: "amber" | "red" | "blue";
}

interface MobileAdminNavProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  pendingInvites?: number;
  systemAlerts?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    id: "invites",
    label: "Richieste Beta",
    href: "/admin/invites",
    icon: UserPlus,
  },
  {
    id: "users",
    label: "Utenti",
    href: "/admin/users",
    icon: Users,
  },
  {
    id: "tiers",
    label: "Piani",
    href: "/admin/tiers",
    icon: Layers,
  },
  {
    id: "audit-log",
    label: "Audit Log",
    href: "/admin/tiers/audit-log",
    icon: ScrollText,
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    id: "service-limits",
    label: "Service Limits",
    href: "/admin/service-limits",
    icon: Activity,
  },
  {
    id: "tos",
    label: "Termini Servizio",
    href: "/admin/tos",
    icon: FileText,
  },
  {
    id: "settings",
    label: "Impostazioni",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function MobileAdminNav({
  isOpen,
  onOpen,
  onClose,
  pendingInvites = 0,
  systemAlerts = 0,
}: MobileAdminNavProps) {
  const pathname = usePathname();

  const getNavItems = (): NavItem[] => {
    return NAV_ITEMS.map((item) => {
      if (item.id === "invites" && pendingInvites > 0) {
        return { ...item, badge: pendingInvites, badgeColor: "amber" as const };
      }
      if (item.id === "dashboard" && systemAlerts > 0) {
        return { ...item, badge: systemAlerts, badgeColor: "red" as const };
      }
      return item;
    });
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const handleNavItemClick = () => {
    onClose();
  };

  const handleBackdropClick = () => {
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <div className="lg:hidden">
      {/* Hamburger Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpen}
        className="fixed top-14 right-4 z-50 h-11 w-11 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        aria-label="Avri menu di navigazione"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r",
          "border-slate-200 dark:border-slate-800 z-40 transition-all duration-300",
          "w-72 max-w-[85vw]",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <span className="font-bold text-lg text-slate-900 dark:text-white">
            Menu
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            aria-label="Chiudi menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav
          className="p-4 space-y-1 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {getNavItems().map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={handleNavItemClick}
                className={cn(
                  "flex items-center gap-3 rounded-xl transition-all relative px-4 py-3",
                  active &&
                    "bg-slate-900 dark:bg-white text-white dark:text-slate-900",
                  !active &&
                    "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span
                    className={cn(
                      "absolute text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center right-3",
                      item.badgeColor === "amber" && "bg-amber-500 text-white",
                      item.badgeColor === "red" && "bg-red-500 text-white",
                      item.badgeColor === "blue" && "bg-blue-500 text-white",
                    )}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Return to app */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Link href="/">
            <button
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
                "bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-800/50",
                "border border-indigo-200 dark:border-indigo-700",
                "text-indigo-700 dark:text-indigo-300",
                "text-sm font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
              )}
              aria-label="Torna all'app"
              onClick={handleNavItemClick}
            >
              <Home className="w-4 h-4" />
              <span>Torna all&apos;app</span>
            </button>
          </Link>
        </div>
      </aside>
    </div>
  );
}
