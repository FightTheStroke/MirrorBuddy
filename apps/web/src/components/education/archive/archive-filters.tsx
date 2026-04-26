"use client";

/**
 * Archive Filters Component
 * Type tabs and advanced filters (subject, date range)
 */

import { Calendar, BookOpen, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type FilterType, FILTER_TABS, SUBJECT_LABELS } from "./constants";
import { useTranslations } from "next-intl";

interface ArchiveFiltersProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  countByType: Record<string, number>;
  subjectFilter: string;
  onSubjectChange: (subject: string) => void;
  availableSubjects: string[];
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function ArchiveFilters({
  filter,
  onFilterChange,
  countByType,
  subjectFilter,
  onSubjectChange,
  availableSubjects,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClearFilters,
  hasActiveFilters,
}: ArchiveFiltersProps) {
  const t = useTranslations("education");
  return (
    <>
      {/* Filter Tabs */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={t("filtraPerTipo")}
      >
        {FILTER_TABS.map(({ value, label }) => (
          <Button
            key={value}
            variant={filter === value ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(value)}
            role="tab"
            aria-selected={filter === value}
            className="gap-1"
          >
            {label}
            {countByType[value] > 0 && (
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  filter === value
                    ? "bg-white/20"
                    : "bg-slate-200 dark:bg-slate-700",
                )}
              >
                {countByType[value]}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="font-medium">{t("filtri")}</span>
        </div>

        {/* Subject Filter */}
        <div className="relative">
          <select
            value={subjectFilter}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="appearance-none pl-8 pr-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            aria-label={t("filtraPerMateria")}
          >
            <option value="all">{t("tutteLeMaterie")}</option>
            {availableSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {SUBJECT_LABELS[subject] || subject}
              </option>
            ))}
          </select>
          <BookOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="pl-8 pr-3 h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={t("dataDa")}
            />
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <span className="text-slate-400">-</span>
          <div className="relative">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="pl-8 pr-3 h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={t("dataA")}
            />
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs gap-1"
          >
            <X className="w-3 h-3" />
            {t("pulisciFiltri")}
          </Button>
        )}
      </div>
    </>
  );
}
