"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href: string;
  isCurrent: boolean;
}

/**
 * Admin breadcrumbs component that auto-generates navigation from pathname
 * Example: /admin/tiers/audit-log → Admin > Tiers > Audit Log
 */
export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations("admin");

  // Generate breadcrumbs from pathname
  const breadcrumbs = generateBreadcrumbs(pathname, t);

  // Don't show breadcrumbs on admin home
  if (pathname === "/admin") {
    return null;
  }

  return (
    <nav
      aria-label={t("breadcrumb")}
      className="mb-4 px-1"
      data-testid="admin-breadcrumbs"
    >
      <ol className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li
            key={crumb.href}
            className="flex items-center gap-1 sm:gap-2 min-w-0"
          >
            {index > 0 && (
              <ChevronRight
                className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-600 shrink-0"
                aria-hidden="true"
              />
            )}
            {crumb.isCurrent ? (
              <span
                className="font-medium text-slate-900 dark:text-white truncate"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                  "transition-colors truncate",
                  "flex items-center gap-1",
                )}
              >
                {index === 0 && (
                  <Home className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                )}
                <span>{crumb.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Generate breadcrumbs from pathname with translation support
 */
function generateBreadcrumbs(
  pathname: string,
  t: ReturnType<typeof useTranslations>,
): Breadcrumb[] {
  // Remove leading/trailing slashes and split
  const parts = pathname.split("/").filter(Boolean);

  // Build breadcrumbs array
  const breadcrumbs: Breadcrumb[] = [];
  let currentPath = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath += `/${part}`;
    const isCurrent = i === parts.length - 1;

    // Get label with translation fallback
    const label = getBreadcrumbLabel(currentPath, part, t);

    breadcrumbs.push({
      label,
      href: currentPath,
      isCurrent,
    });
  }

  return breadcrumbs;
}

/**
 * Get translated label for breadcrumb with fallback to humanized path segment
 */
function getBreadcrumbLabel(
  fullPath: string,
  segment: string,
  t: ReturnType<typeof useTranslations>,
): string {
  // Map of paths to translation keys
  const pathToTranslationKey: Record<string, string> = {
    "/admin": "dashboardTitle",
    "/admin/invites": "betaRequests",
    "/admin/users": "sidebar.users",
    "/admin/analytics": "sidebar.analytics",
    "/admin/tos": "terms",
    "/admin/settings": "sidebar.settings",
    "/admin/tiers": "sidebar.tiers",
    "/admin/locales": "sidebar.localization",
    "/admin/safety": "sidebar.safety",
    "/admin/risk-register": "sidebar.riskRegister",
    "/admin/service-limits": "sidebar.serviceLimits",
    "/admin/tiers/audit-log": "auditLog",
    "/admin/tiers/definitions": "tierDefinitions",
    "/admin/characters": "characters.title",
    "/admin/audit": "audit.title",
    "/admin/communications": "communications.title",
    "/admin/communications/templates": "communications.templates",
    "/admin/communications/campaigns": "communications.campaigns",
    "/admin/communications/stats": "communications.stats",
  };

  // Try to get translated label
  const translationKey = pathToTranslationKey[fullPath];
  if (translationKey) {
    try {
      return t(translationKey);
    } catch {
      // Translation key doesn't exist, fall through to humanization
    }
  }

  // Fallback: humanize the segment
  return humanizeSegment(segment);
}

/**
 * Convert kebab-case or path segment to human-readable format
 * Examples:
 * - "audit-log" → "Audit Log"
 * - "tiers" → "Tiers"
 * - "123" → "123" (IDs preserved)
 */
function humanizeSegment(segment: string): string {
  // If it's a number (ID), return as-is
  if (/^\d+$/.test(segment)) {
    return segment;
  }

  // Common admin segments
  const commonSegments: Record<string, string> = {
    admin: "Admin",
    edit: "Edit",
    new: "New",
    create: "Create",
    view: "View",
    delete: "Delete",
    communications: "Communications",
    templates: "Templates",
    campaigns: "Campaigns",
    stats: "Statistics",
  };

  if (commonSegments[segment.toLowerCase()]) {
    return commonSegments[segment.toLowerCase()];
  }

  // Convert kebab-case to Title Case
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
