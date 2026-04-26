/**
 * Type definitions for Archive components
 */

import type { ChangeEvent } from "react";
import type { MaterialRecord } from "@/lib/storage/materials-db";
import type { FilterType, SortBy } from "./constants";

export interface ArchiveItem extends MaterialRecord {
  title?: string;
}

export interface ArchiveItemViewProps {
  items: ArchiveItem[];
  onDelete: (id: string) => void;
  onView: (item: ArchiveItem) => void;
  onBookmark: (id: string, bookmarked: boolean) => void;
  onRate: (id: string, rating: number) => void;
}

export interface UseArchiveViewReturn {
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;
  searchQuery: string;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  subjectFilter: string;
  setSubjectFilter: (subject: string) => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  isLoading: boolean;
  selectedItem: ArchiveItem | null;
  filtered: ArchiveItem[];
  availableSubjects: string[];
  countByType: Record<string, number>;
  materials: ArchiveItem[];
  handleDelete: (toolId: string) => Promise<void>;
  handleView: (item: ArchiveItem) => void;
  handleCloseViewer: () => void;
  handleNavigateToRelated: (toolId: string) => void;
  handleSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleBookmark: (toolId: string, isBookmarked: boolean) => Promise<void>;
  handleRate: (toolId: string, userRating: number) => Promise<void>;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}
