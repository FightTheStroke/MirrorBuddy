"use client";

import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  MessageSquareText,
  HelpCircle,
  Accessibility,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DashboardTab } from "./dashboard-tabs";
import { useTranslations } from "next-intl";

const TAB_CONFIG = [
  { value: "panoramica" as const, label: "Panoramica", icon: LayoutDashboard },
  { value: "progressi" as const, label: "Progressi", icon: TrendingUp },
  {
    value: "osservazioni" as const,
    label: "Osservazioni",
    icon: MessageSquareText,
  },
  { value: "guida" as const, label: "Guida", icon: HelpCircle },
  {
    value: "accessibilita" as const,
    label: "Accessibilità",
    icon: Accessibility,
  },
];

interface ParentMobileNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

/**
 * Mobile navigation for parent dashboard
 * - Hamburger menu pattern with 44x44px touch targets
 * - Shows current active page
 * - Hidden on desktop (md+)
 * - WCAG 2.1 AA compliant keyboard navigation
 */
export function ParentMobileNav({
  activeTab,
  onTabChange,
}: ParentMobileNavProps) {
  const t = useTranslations("settings");
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Close menu when Escape is pressed
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        hamburgerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleTabClick = (tab: DashboardTab) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border"
      aria-label={t("parentDashboardNavigation")}
      data-open={isOpen}
    >
      {/* Bottom navigation bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-card shadow-lg">
        {/* Hamburger button with 44x44px touch target */}
        <Button
          ref={hamburgerRef}
          variant="ghost"
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t("menu")}
          aria-expanded={isOpen}
          className="h-11 w-11 p-0 flex items-center justify-center hover:bg-accent"
        >
          {isOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </Button>

        {/* Current tab indicator */}
        <div className="flex-1 text-center">
          <p className="text-sm font-medium text-foreground">
            {TAB_CONFIG.find((tab) => tab.value === activeTab)?.label}
          </p>
        </div>

        {/* Spacer for alignment */}
        <div className="h-11 w-11" />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-16 left-0 right-0 bg-card border border-border rounded-t-lg shadow-lg"
          role="menu"
        >
          <div className="flex flex-col p-2 gap-1">
            {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleTabClick(value)}
                aria-current={activeTab === value ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  "h-12 min-h-11", // 44px minimum touch target
                  activeTab === value
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent",
                )}
                role="menuitem"
              >
                <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
