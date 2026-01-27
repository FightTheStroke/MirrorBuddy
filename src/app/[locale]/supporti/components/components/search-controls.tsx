/**
 * @file search-controls.tsx
 * @brief Search and controls bar component
 */

import { motion } from "framer-motion";
import { Search, X, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SORT_OPTIONS } from "@/components/education/archive";
import type { SortBy, ViewMode } from "@/components/education/archive";

interface SearchControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: SortBy;
  onSortChange: (value: SortBy) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hasActiveFilters: boolean;
  filteredCount: number;
  onClearFilters: () => void;
}

export function SearchControls({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  filteredCount,
  onClearFilters,
}: SearchControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6"
    >
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cerca nei tuoi materiali..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11 text-base"
            aria-label="Cerca materiali"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              aria-label="Cancella ricerca"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredCount} {filteredCount === 1 ? "risultato" : "risultati"}
          </span>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="ml-2"
            >
              Resetta filtri
            </Button>
          )}
        </div>

        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortBy)}>
          <SelectTrigger
            className="w-full sm:w-[160px] h-11"
            aria-label="Ordina per"
          >
            <SelectValue placeholder="Ordina per" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex border rounded-lg dark:border-slate-700">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-r-none h-11 w-11",
              viewMode === "grid" && "bg-slate-100 dark:bg-slate-700",
            )}
            onClick={() => onViewModeChange("grid")}
            aria-label="Vista griglia"
            aria-pressed={viewMode === "grid"}
          >
            <Grid className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-l-none h-11 w-11",
              viewMode === "list" && "bg-slate-100 dark:bg-slate-700",
            )}
            onClick={() => onViewModeChange("list")}
            aria-label="Vista lista"
            aria-pressed={viewMode === "list"}
          >
            <List className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
