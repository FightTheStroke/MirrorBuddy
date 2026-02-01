"use client";

/**
 * Skip Link Component
 * Provides keyboard navigation and accessibility for quick access to main content
 * WCAG 2.1 AA compliant: visible on focus, high contrast, 2px focus ring
 */

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SkipLinkProps {
  targetId?: string;
  className?: string;
}

export function SkipLink({
  targetId = "main-content",
  className,
}: SkipLinkProps) {
  const t = useTranslations("common");

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      // Focus the target element
      targetElement.focus();
      targetElement.scrollIntoView({ behavior: "smooth" });

      // Announce to screen readers
      const announcement = document.createElement("div");
      announcement.setAttribute("role", "status");
      announcement.setAttribute("aria-live", "polite");
      announcement.className = "sr-only";
      announcement.textContent = t("skipLinkFocused");
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 1000);
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      data-testid="skip-link"
      className={cn(
        // Position: fixed top-left, accessible but visually hidden
        "fixed top-1 left-1 z-[9999]",
        // Hidden but accessible: opacity 0, then visible on focus
        "opacity-0 focus:opacity-100",
        // Invisible by default (no pointer events), clickable only when focused
        "pointer-events-none focus:pointer-events-auto",
        // Styling: high contrast, visible focus ring
        "px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
        "rounded-b-md shadow-lg",
        // Focus management: visible 2px outline, 3:1 contrast minimum
        "focus:outline-2 focus:outline-offset-2 focus:outline-white dark:focus:outline-slate-900",
        "focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
        "hover:bg-slate-800 dark:hover:bg-slate-200",
        "transition-colors duration-150",
        // Font: readable and accessible
        "text-sm font-semibold",
        className,
      )}
      aria-label={t("skipToMainContent")}
    >
      {t("skipToMainContent")}
    </a>
  );
}
