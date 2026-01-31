import { useState, useMemo, useCallback, type ChangeEvent } from "react";
import { useMaterialsView } from "@/lib/hooks/use-materials-view";
import { type FilterType, type SortBy } from "./constants";
import { type ArchiveItem, type UseArchiveViewReturn } from "./types";

export function useArchiveView(): UseArchiveViewReturn {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const dateFilterFn = useCallback(
    (materials: ArchiveItem[]) => {
      let result = materials;
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        result = result.filter((item) => new Date(item.createdAt) >= fromDate);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        result = result.filter((item) => new Date(item.createdAt) <= toDate);
      }
      return result;
    },
    [dateFrom, dateTo],
  );

  const base = useMaterialsView({ dateFilterFn });

  const handleNavigateToRelated = useCallback(
    (toolId: string) => {
      const target = base.materials.find((item) => item.toolId === toolId);
      if (target) base.handleView(target);
    },
    [base],
  );

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => base.setSearchQuery(e.target.value),
    [base],
  );

  const clearFiltersCustom = useCallback(() => {
    base.setSubjectFilter(null);
    setDateFrom("");
    setDateTo("");
  }, [base]);

  const countByType = useMemo(
    () => ({
      all: base.materials.length,
      bookmarked: base.materials.filter((m) => m.isBookmarked).length,
      ...base.materials.reduce(
        (acc, item) => {
          acc[item.toolType] = (acc[item.toolType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    }),
    [base.materials],
  );

  return {
    filter: base.typeFilter as FilterType,
    setFilter: base.setTypeFilter,
    sortBy: base.sortBy as SortBy,
    setSortBy: base.setSortBy,
    searchQuery: base.searchQuery,
    viewMode: base.viewMode,
    setViewMode: base.setViewMode,
    subjectFilter: base.subjectFilter || "all",
    setSubjectFilter: (s: string) =>
      base.setSubjectFilter(s === "all" ? null : s),
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    isLoading: base.isLoading,
    selectedItem: base.selectedItem,
    filtered: base.filtered,
    availableSubjects: base.availableSubjects,
    countByType,
    materials: base.materials,
    handleDelete: base.handleDelete,
    handleView: base.handleView,
    handleCloseViewer: base.handleCloseViewer,
    handleNavigateToRelated,
    handleSearchChange,
    handleBookmark: base.handleBookmark,
    handleRate: base.handleRate,
    clearFilters: clearFiltersCustom,
    hasActiveFilters:
      base.subjectFilter !== null || dateFrom !== "" || dateTo !== "",
  };
}
