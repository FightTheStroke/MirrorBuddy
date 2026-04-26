"use client";

import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { getToolsByCategory, TOOL_CATEGORIES } from "@/lib/tools/constants";

/**
 * Compact tool grid for mobile settings page.
 * Shows all tools grouped by category (Carica, Crea, Cerca).
 * Clicking any tool navigates to /{locale}/astuccio.
 */
export function MobileToolsSection() {
  const t = useTranslations("tools");
  const tSettings = useTranslations("settings");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleNavigate = () => {
    router.push(`/${locale}/astuccio`);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {tSettings("toolsSection.subtitle")}
      </p>
      {TOOL_CATEGORIES.map((category) => {
        const tools = getToolsByCategory(category.category);
        if (tools.length === 0) return null;

        return (
          <div key={category.id}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              {category.title}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.type}
                    onClick={handleNavigate}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5",
                      "rounded-lg border border-slate-200 dark:border-slate-700",
                      "bg-white dark:bg-slate-900",
                      "hover:bg-slate-50 dark:hover:bg-slate-800",
                      "active:bg-slate-100 dark:active:bg-slate-700",
                      "transition-colors duration-150",
                      "text-left min-h-[44px]",
                    )}
                    aria-label={t(`${tool.type}.label`)}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                      {t(`${tool.type}.label`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
