import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Fuse from "fuse.js";
import { logger } from "@/lib/logger";
import { getActiveMaterials, deleteMaterial } from "@/lib/storage/materials-db";
import { updateMaterialInteraction } from "@/components/education/archive";
import type {
  ArchiveItem,
  SortBy,
  ViewMode,
} from "@/components/education/archive";

interface UseMaterialsViewConfig {
  dateFilterFn?: (materials: ArchiveItem[]) => ArchiveItem[];
}

export function useMaterialsView(config?: UseMaterialsViewConfig) {
  const { dateFilterFn } = config || {};

  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [materials, setMaterials] = useState<ArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(
      () => setDebouncedQuery(searchQuery),
      200,
    );
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const records = await getActiveMaterials();
        setMaterials(records as ArchiveItem[]);
      } catch (err) {
        logger.error("Failed to load materials", undefined, err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const counts = useMemo(() => {
    const result = {
      total: materials.length,
      bookmarked: 0,
      byType: {} as Record<string, number>,
      bySubject: {} as Record<string, number>,
    };
    for (const item of materials) {
      if (item.isBookmarked) result.bookmarked++;
      result.byType[item.toolType] = (result.byType[item.toolType] || 0) + 1;
      if (item.subject)
        result.bySubject[item.subject] =
          (result.bySubject[item.subject] || 0) + 1;
    }
    return result;
  }, [materials]);

  const availableSubjects = useMemo(
    () =>
      Array.from(
        new Set(materials.map((m) => m.subject).filter(Boolean) as string[]),
      ).sort(),
    [materials],
  );

  const filtered = useMemo(() => {
    if (materials.length === 0) return [];
    let result = [...materials];
    try {
      if (typeFilter === "bookmarked")
        result = result.filter((item) => item.isBookmarked);
      else if (typeFilter !== "all")
        result = result.filter((item) => item.toolType === typeFilter);
      if (subjectFilter)
        result = result.filter((item) => item.subject === subjectFilter);
      if (dateFilterFn) result = dateFilterFn(result);
      if (debouncedQuery.trim()) {
        const fuse = new Fuse(result, {
          keys: [
            { name: "title", weight: 2 },
            { name: "subject", weight: 1 },
          ],
          threshold: 0.3,
          ignoreLocation: true,
          minMatchCharLength: 2,
        });
        result = fuse.search(debouncedQuery).map((r) => r.item);
      }
      result.sort((a, b) => {
        if (sortBy === "date")
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        if (sortBy === "type") return a.toolType.localeCompare(b.toolType);
        if (sortBy === "rating")
          return (b.userRating || 0) - (a.userRating || 0);
        if (sortBy === "views") return (b.viewCount || 0) - (a.viewCount || 0);
        return 0;
      });
    } catch (err) {
      logger.error("Filter error", undefined, err);
    }
    return result;
  }, [
    materials,
    typeFilter,
    subjectFilter,
    dateFilterFn,
    debouncedQuery,
    sortBy,
  ]);

  const hasActiveFilters =
    typeFilter !== "all" || subjectFilter !== null || searchQuery.trim() !== "";
  const clearAllFilters = useCallback(() => {
    setTypeFilter("all");
    setSubjectFilter(null);
    setSearchQuery("");
  }, []);

  const handleDelete = useCallback(async (toolId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo materiale?")) return;
    try {
      await deleteMaterial(toolId);
      setMaterials((prev) => prev.filter((m) => m.toolId !== toolId));
    } catch (err) {
      logger.error("Failed to delete", undefined, err);
    }
  }, []);

  const handleView = useCallback(
    (item: ArchiveItem) => setSelectedItem(item),
    [],
  );
  const handleCloseViewer = useCallback(() => setSelectedItem(null), []);

  const handleBookmark = useCallback(
    async (toolId: string, isBookmarked: boolean) => {
      try {
        const success = await updateMaterialInteraction(toolId, {
          isBookmarked,
        });
        if (success) {
          setMaterials((prev) =>
            prev.map((m) => (m.toolId === toolId ? { ...m, isBookmarked } : m)),
          );
        }
      } catch (err) {
        logger.error("Failed to update bookmark", undefined, err);
      }
    },
    [],
  );

  const handleRate = useCallback(async (toolId: string, userRating: number) => {
    try {
      const success = await updateMaterialInteraction(toolId, { userRating });
      if (success) {
        setMaterials((prev) =>
          prev.map((m) => (m.toolId === toolId ? { ...m, userRating } : m)),
        );
      }
    } catch (err) {
      logger.error("Failed to update rating", undefined, err);
    }
  }, []);

  return {
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    materials,
    isLoading,
    selectedItem,
    filtered,
    typeFilter,
    setTypeFilter,
    subjectFilter,
    setSubjectFilter,
    availableSubjects,
    counts,
    handleDelete,
    handleView,
    handleCloseViewer,
    handleBookmark,
    handleRate,
    clearAllFilters,
    hasActiveFilters,
    debouncedQuery,
  };
}
