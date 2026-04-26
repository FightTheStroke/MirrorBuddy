"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardPanelProps {
  title: string;
  detailHref?: string;
  children: React.ReactNode;
  className?: string;
  span?: 1 | 2;
}

export function DashboardPanel({
  title,
  detailHref,
  children,
  className,
  span = 1,
}: DashboardPanelProps) {
  const t = useTranslations("admin.dashboard");

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col",
        span === 2 && "col-span-1 md:col-span-2",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        {detailHref && (
          <a
            href={detailHref}
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            aria-label={`${title} — ${t("viewDetails")}`}
          >
            {t("viewDetails")}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
