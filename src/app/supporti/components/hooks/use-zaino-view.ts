import { useState, useMemo, useCallback } from "react";
import { useMaterialsView } from "@/lib/hooks/use-materials-view";
import { DATE_FILTERS, DATE_FILTER_IDS } from "../constants";
import type { ArchiveItem } from "@/components/education/archive";

interface UseZainoViewProps {
  initialType?: string;
  initialSubject?: string;
}

export function useZainoView({
  initialType,
  initialSubject,
}: UseZainoViewProps) {
  const [error] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const dateFilterFn = useCallback(
    (materials: ArchiveItem[]) => {
      if (dateFilter === "all") return materials;
      const filter = DATE_FILTERS.find((f) => f.id === dateFilter);
      if (!filter) return materials;
      const { start, end } = filter.getRange();
      return materials.filter((item) => {
        try {
          return (
            new Date(item.createdAt) >= start && new Date(item.createdAt) <= end
          );
        } catch {
          return true;
        }
      });
    },
    [dateFilter],
  );

  const base = useMaterialsView({ dateFilterFn });

  const counts = useMemo(
    () => ({
      ...base.counts,
      byDate: DATE_FILTER_IDS.reduce(
        (acc, id) => {
          const filter = DATE_FILTERS.find((f) => f.id === id);
          if (filter) {
            const { start, end } = filter.getRange();
            acc[id] = base.materials.filter((m) => {
              try {
                return (
                  new Date(m.createdAt) >= start && new Date(m.createdAt) <= end
                );
              } catch {
                return false;
              }
            }).length;
          }
          return acc;
        },
        {} as Record<string, number>,
      ),
    }),
    [base.materials, base.counts],
  );

  const handleTypeFilter = useCallback(
    (type: string) => {
      setSelectedPathId(null);
      setSelectedTopicId(null);
      base.setTypeFilter(type);
    },
    [base],
  );

  return {
    ...base,
    error,
    typeFilter:
      initialType && base.typeFilter === "all" ? initialType : base.typeFilter,
    dateFilter,
    subjectFilter: initialSubject
      ? base.subjectFilter || initialSubject
      : base.subjectFilter,
    subjects: base.availableSubjects,
    isBookmarked: base.typeFilter === "bookmarked",
    isPercorsi: base.typeFilter === "percorsi",
    counts,
    selectedPathId,
    setSelectedPathId,
    selectedTopicId,
    setSelectedTopicId,
    handleTypeFilter,
    handleDateFilter: setDateFilter,
    handleSubjectFilter: base.setSubjectFilter,
    clearAllFilters: useCallback(() => {
      base.clearAllFilters();
      setDateFilter("all");
    }, [base]),
    getFilterCount: useCallback(
      (id: string) =>
        id === "all"
          ? counts.total
          : id === "bookmarked"
            ? counts.bookmarked
            : counts.byType[id] || 0,
      [counts],
    ),
    getDateFilterCount: useCallback(
      (id: string) => counts.byDate[id] || 0,
      [counts],
    ),
    getSubjectFilterCount: useCallback(
      (id: string) => counts.bySubject[id] || 0,
      [counts],
    ),
    hasActiveFilters: base.hasActiveFilters || dateFilter !== "all",
  };
}
