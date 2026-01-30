"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronRight, Menu, Bell, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TierSimulator } from "./tier-simulator";

interface AdminHeaderProps {
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
  pendingInvites?: number;
  systemAlerts?: number;
}

export function AdminHeader({
  onMenuClick,
  sidebarOpen: _sidebarOpen,
  pendingInvites = 0,
  systemAlerts = 0,
}: AdminHeaderProps) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  const SECTION_TITLES: Record<string, string> = {
    "/admin": t("dashboard"),
    "/admin/invites": t("betaRequests"),
    "/admin/users": t("sidebar.users"),
    "/admin/analytics": t("sidebar.analytics"),
    "/admin/tos": t("terms"),
    "/admin/settings": t("sidebar.settings"),
  };

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    const breadcrumbs: { label: string; href: string }[] = [];

    let currentPath = "";
    for (const part of parts) {
      currentPath += `/${part}`;
      const label = SECTION_TITLES[currentPath] || part;
      breadcrumbs.push({ label, href: currentPath });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const currentTitle = SECTION_TITLES[pathname] || "Admin";

  return (
    <header
      className={cn(
        "h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800",
        "flex items-center justify-between px-3 sm:px-4 sticky top-0 z-30",
      )}
    >
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {/* Mobile menu button - WCAG 44px minimum */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden text-slate-500 h-11 w-11 shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="hidden sm:block min-w-0">
          <ol className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-1 min-w-0">
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-slate-900 dark:text-white truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Mobile title - responsive sizing */}
        <h1 className="sm:hidden font-semibold text-base text-slate-900 dark:text-white truncate">
          {currentTitle}
        </h1>
      </div>

      {/* Stats badges and tier simulator */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Tier simulator for admin testing */}
        <TierSimulator />

        {/* Pending invites badge */}
        {pendingInvites > 0 && (
          <Link
            href="/admin/invites"
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            aria-label={t("pendingBetaRequests", { count: pendingInvites })}
          >
            <UserPlus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
              {pendingInvites > 99 ? "99+" : pendingInvites}
            </span>
          </Link>
        )}

        {/* System alerts badge */}
        {systemAlerts > 0 && (
          <Link
            href="/admin"
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            aria-label={t("systemAlerts", { count: systemAlerts })}
          >
            <Bell className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-bold text-red-700 dark:text-red-300">
              {systemAlerts > 99 ? "99+" : systemAlerts}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
