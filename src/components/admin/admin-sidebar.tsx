/* eslint-disable local-rules/no-missing-i18n-keys -- admin keys are nested under admin.admin in JSON, resolved at runtime */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  BarChart3,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Activity,
  Layers,
  ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogoBrain } from "@/components/branding/logo-brain";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  badgeColor?: "amber" | "red" | "blue";
}

interface AdminSidebarProps {
  open: boolean;
  onToggle: () => void;
  pendingInvites?: number;
  systemAlerts?: number;
}

export function AdminSidebar({
  open,
  onToggle,
  pendingInvites = 0,
  systemAlerts = 0,
}: AdminSidebarProps) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const handleItemClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      onToggle();
    }
  };

  const NAV_ITEMS: NavItem[] = [
    {
      id: "dashboard",
      label: t("dashboard"),
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      id: "invites",
      label: t("betaRequests"),
      href: "/admin/invites",
      icon: UserPlus,
    },
    {
      id: "users",
      label: t("sidebar.users"),
      href: "/admin/users",
      icon: Users,
    },
    {
      id: "tiers",
      label: t("sidebar.tiers"),
      href: "/admin/tiers",
      icon: Layers,
    },
    {
      id: "audit-log",
      label: t("sidebar.auditLog"),
      href: "/admin/tiers/audit-log",
      icon: ScrollText,
    },
    {
      id: "analytics",
      label: t("sidebar.analytics"),
      href: "/admin/analytics",
      icon: BarChart3,
    },
    {
      id: "service-limits",
      label: t("sidebar.serviceLimits"),
      href: "/admin/service-limits",
      icon: Activity,
    },
    {
      id: "tos",
      label: t("terms"),
      href: "/admin/tos",
      icon: FileText,
    },
    {
      id: "settings",
      label: t("sidebar.settings"),
      href: "/admin/settings",
      icon: Settings,
    },
  ];

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

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r",
        "border-slate-200 dark:border-slate-800 z-40 transition-all duration-300",
        "w-72 max-w-[85vw] lg:max-w-none lg:w-64",
        open
          ? "translate-x-0 lg:w-64"
          : "-translate-x-full lg:translate-x-0 lg:w-20",
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          href="/admin"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <LogoBrain
            alt="MirrorBuddy Admin"
            size={36}
            wrapperClassName="bg-slate-900 dark:bg-slate-100 flex items-center justify-center"
            className="object-contain"
            priority
          />
          {open && (
            <span className="font-bold text-lg text-slate-900 dark:text-white">
              Admin
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          aria-label={open ? t("collapseMenu") : t("expandMenu")}
        >
          {open ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
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
              onClick={handleItemClick}
              className={cn(
                "flex items-center gap-3 rounded-xl transition-all relative",
                open ? "px-4 py-3" : "justify-center px-2 py-3",
                active &&
                  "bg-slate-900 dark:bg-white text-white dark:text-slate-900",
                !active &&
                  "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {open && <span className="font-medium">{item.label}</span>}
              {item.badge && item.badge > 0 && (
                <span
                  className={cn(
                    "absolute text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center",
                    open ? "right-3" : "top-1 right-1",
                    item.badgeColor === "amber" && "bg-amber-500 text-white",
                    item.badgeColor === "red" && "bg-red-500 text-white",
                    item.badgeColor === "blue" && "bg-blue-600 text-white",
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
            aria-label={t("returnToApp")}
            onClick={handleItemClick}
          >
            <Home className="w-4 h-4" />
            {open && <span>{t("returnToApp")}</span>}
          </button>
        </Link>
      </div>
    </aside>
  );
}
