/**
 * Knowledge Hub Header Component
 * View switcher and search bar
 */

"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getViewOptions } from "./constants";
import type { ViewMode } from "./knowledge-hub/types";

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
}

export function KnowledgeHubHeader({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onClearSearch,
}: HeaderProps) {
  const t = useTranslations("education.knowledge-hub");
  const viewOptions = getViewOptions(t);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Knowledge Hub
        </h1>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-x-auto scrollbar-hide">
          {viewOptions.map((option) => (
            <Button
              key={option.id}
              variant={viewMode === option.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange(option.id)}
              className={cn(
                "gap-2",
                viewMode === option.id &&
                  "bg-white dark:bg-slate-600 shadow-sm",
              )}
              title={option.description}
              aria-label={option.label}
              aria-pressed={viewMode === option.id}
            >
              {option.icon}
              <span className="hidden sm:inline">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full lg:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t("header.search.placeholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "w-full pl-9 pr-8 h-9 rounded-lg border",
            "border-slate-200 dark:border-slate-600",
            "bg-white dark:bg-slate-700",
            "text-sm text-slate-900 dark:text-white",
            "placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
          )}
          aria-label={t("header.search.aria-label")}
        />
        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600"
            aria-label={t("header.search.clear-aria-label")}
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );
}
