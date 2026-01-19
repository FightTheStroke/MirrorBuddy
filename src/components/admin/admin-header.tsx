"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
}

const SECTION_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/invites": "Richieste Beta",
  "/admin/users": "Utenti",
  "/admin/analytics": "Analytics",
  "/admin/tos": "Termini di Servizio",
  "/admin/settings": "Impostazioni",
};

export function AdminHeader({
  onMenuClick,
  sidebarOpen: _sidebarOpen,
}: AdminHeaderProps) {
  const pathname = usePathname();

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
        "flex items-center justify-between px-4 sticky top-0 z-30",
      )}
    >
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMenuClick}
          className="lg:hidden text-slate-500"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="hidden sm:block">
          <ol className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-slate-900 dark:text-white">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Mobile title */}
        <h1 className="sm:hidden font-semibold text-slate-900 dark:text-white">
          {currentTitle}
        </h1>
      </div>
    </header>
  );
}
