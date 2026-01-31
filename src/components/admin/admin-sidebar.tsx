"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogoBrain } from "@/components/branding/logo-brain";
import { createNavSections } from "./admin-sidebar-sections";

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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["people", "content", "analytics", "system", "ops"]),
  );

  const handleItemClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      onToggle();
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getNavSections = () => {
    return createNavSections(t).map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.id === "invites" && pendingInvites > 0) {
          return {
            ...item,
            badge: pendingInvites,
            badgeColor: "amber" as const,
          };
        }
        if (item.id === "dashboard" && systemAlerts > 0) {
          return { ...item, badge: systemAlerts, badgeColor: "red" as const };
        }
        return item;
      }),
    }));
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

      <nav
        className="p-4 space-y-3 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 120px)" }}
      >
        {getNavSections().map((section) => {
          const isExpanded = expandedSections.has(section.id);
          return (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg transition-all",
                  open ? "px-3 py-2" : "justify-center px-2 py-2",
                  "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
              >
                <section.icon className="h-4 w-4 shrink-0" />
                {open && (
                  <>
                    <span className="font-semibold text-xs uppercase tracking-wider flex-1 text-left">
                      {section.label}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </>
                )}
              </button>
              {isExpanded && (
                <div className="mt-1 space-y-1">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={handleItemClick}
                        className={cn(
                          "flex items-center gap-3 rounded-xl transition-all relative",
                          open ? "px-4 py-2.5" : "justify-center px-2 py-2.5",
                          active &&
                            "bg-slate-900 dark:bg-white text-white dark:text-slate-900",
                          !active &&
                            "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {open && (
                          <span className="font-medium text-sm">
                            {item.label}
                          </span>
                        )}
                        {item.badge && item.badge > 0 && (
                          <span
                            className={cn(
                              "absolute text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center",
                              open ? "right-3" : "top-1 right-1",
                              item.badgeColor === "amber" &&
                                "bg-amber-500 text-white",
                              item.badgeColor === "red" &&
                                "bg-red-500 text-white",
                              item.badgeColor === "blue" &&
                                "bg-blue-600 text-white",
                            )}
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
