"use client";

import { useTranslations } from "next-intl";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Filters {
  action: string;
  entityType: string;
  from: string;
  to: string;
}

interface AuditLogFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const ACTION_OPTIONS = [
  "",
  "user.delete",
  "user.restore",
  "user.disable",
  "user.enable",
  "invite.approve",
  "invite.reject",
  "tier.change",
  "character.toggle",
  "character.update",
  "settings.update",
];

const ENTITY_OPTIONS = [
  "",
  "User",
  "Invite",
  "Tier",
  "CharacterConfig",
  "Settings",
];

export function AuditLogFilters({ filters, onChange }: AuditLogFiltersProps) {
  const t = useTranslations("admin");

  const hasActiveFilters =
    filters.action || filters.entityType || filters.from || filters.to;

  const clearFilters = () => {
    onChange({ action: "", entityType: "", from: "", to: "" });
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("audit.filters")}
        </span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto text-xs h-7"
          >
            <X className="h-3 w-3 mr-1" />
            {t("audit.clearFilters")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Action filter */}
        <div>
          <label
            htmlFor="filter-action"
            className="block text-xs text-slate-500 mb-1"
          >
            {t("audit.actionType")}
          </label>
          <select
            id="filter-action"
            value={filters.action}
            onChange={(e) => onChange({ ...filters, action: e.target.value })}
            className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt || t("audit.allActions")}
              </option>
            ))}
          </select>
        </div>

        {/* Entity type filter */}
        <div>
          <label
            htmlFor="filter-entity"
            className="block text-xs text-slate-500 mb-1"
          >
            {t("audit.entityType")}
          </label>
          <select
            id="filter-entity"
            value={filters.entityType}
            onChange={(e) =>
              onChange({ ...filters, entityType: e.target.value })
            }
            className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
          >
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt || t("audit.allEntities")}
              </option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div>
          <label
            htmlFor="filter-from"
            className="block text-xs text-slate-500 mb-1"
          >
            {t("audit.from")}
          </label>
          <Input
            id="filter-from"
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className="h-9"
          />
        </div>

        {/* Date to */}
        <div>
          <label
            htmlFor="filter-to"
            className="block text-xs text-slate-500 mb-1"
          >
            {t("audit.to")}
          </label>
          <Input
            id="filter-to"
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
