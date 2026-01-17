/**
 * Archive View Hook - State management and business logic
 */
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ChangeEvent,
} from "react";
import Fuse from "fuse.js";
import { logger } from "@/lib/logger";
import { getActiveMaterials } from "@/lib/storage/materials-db-utils";
import { deleteMaterial } from "@/lib/storage/materials-db-crud";
import { type FilterType, type SortBy } from "./constants";
import { updateMaterialInteraction } from "./utils";
import { type ArchiveItem, type UseArchiveViewReturn } from "./types";

export function useArchiveView(): UseArchiveViewReturn {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [materials, setMaterials] = useState<ArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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
    async function loadMaterials() {
      try {
        setIsLoading(true);
        const records = await getActiveMaterials();
        setMaterials(records as ArchiveItem[]);
      } catch (error) {
        logger.error("Failed to load materials", undefined, error);
      } finally {
        setIsLoading(false);
      }
    }
    loadMaterials();
  }, []);

  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    for (const item of materials) if (item.subject) subjects.add(item.subject);
    return Array.from(subjects).sort();
  }, [materials]);

  const filtered = useMemo(() => {
    let result = [...materials];
    if (filter === "bookmarked")
      result = result.filter((item) => item.isBookmarked);
    else if (filter !== "all")
      result = result.filter((item) => item.toolType === filter);
    if (subjectFilter !== "all")
      result = result.filter((item) => item.subject === subjectFilter);
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
    if (debouncedQuery.trim()) {
      const fuse = new Fuse(result, {
        keys: [
          { name: "title", weight: 2 },
          { name: "subject", weight: 1 },
          { name: "maestroId", weight: 0.5 },
          { name: "toolType", weight: 0.5 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });
      result = fuse.search(debouncedQuery).map((r) => r.item);
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "type":
          return a.toolType.localeCompare(b.toolType);
        case "rating":
          return (b.userRating || 0) - (a.userRating || 0);
        case "views":
          return (b.viewCount || 0) - (a.viewCount || 0);
        default:
          return 0;
      }
    });
    return result;
  }, [
    materials,
    filter,
    debouncedQuery,
    sortBy,
    subjectFilter,
    dateFrom,
    dateTo,
  ]);

  const handleDelete = useCallback(async (toolId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo materiale?")) return;
    try {
      await deleteMaterial(toolId);
      setMaterials((prev) => prev.filter((m) => m.toolId !== toolId));
    } catch (error) {
      logger.error("Failed to delete material", undefined, error);
    }
  }, []);

  const handleView = useCallback((item: ArchiveItem) => {
    logger.debug("Opening material viewer", {
      toolId: item.toolId,
      toolType: item.toolType,
    });
    setSelectedItem(item);
  }, []);

  const handleCloseViewer = useCallback(() => setSelectedItem(null), []);

  const handleNavigateToRelated = useCallback(
    (toolId: string) => {
      const target = materials.find((item) => item.toolId === toolId);
      if (target) setSelectedItem(target);
    },
    [materials],
  );

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [],
  );

  const handleBookmark = useCallback(
    async (toolId: string, isBookmarked: boolean) => {
      const success = await updateMaterialInteraction(toolId, { isBookmarked });
      if (success)
        setMaterials((prev) =>
          prev.map((m) => (m.toolId === toolId ? { ...m, isBookmarked } : m)),
        );
    },
    [],
  );

  const handleRate = useCallback(async (toolId: string, userRating: number) => {
    const success = await updateMaterialInteraction(toolId, { userRating });
    if (success)
      setMaterials((prev) =>
        prev.map((m) => (m.toolId === toolId ? { ...m, userRating } : m)),
      );
  }, []);

  const clearFilters = useCallback(() => {
    setSubjectFilter("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  const countByType = useMemo(() => {
    const counts: Record<string, number> = {
      all: materials.length,
      bookmarked: materials.filter((m) => m.isBookmarked).length,
    };
    for (const item of materials)
      counts[item.toolType] = (counts[item.toolType] || 0) + 1;
    return counts;
  }, [materials]);

  return {
    filter,
    setFilter,
    sortBy,
    setSortBy,
    searchQuery,
    viewMode,
    setViewMode,
    subjectFilter,
    setSubjectFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    isLoading,
    selectedItem,
    filtered,
    availableSubjects,
    countByType,
    materials,
    handleDelete,
    handleView,
    handleCloseViewer,
    handleNavigateToRelated,
    handleSearchChange,
    handleBookmark,
    handleRate,
    clearFilters,
    hasActiveFilters:
      subjectFilter !== "all" || dateFrom !== "" || dateTo !== "",
  };
}
