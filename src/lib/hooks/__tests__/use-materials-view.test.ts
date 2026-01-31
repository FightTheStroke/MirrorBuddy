import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useMaterialsView } from "../use-materials-view";
import * as materialsDb from "@/lib/storage/materials-db";
import * as archiveUtils from "@/components/education/archive/utils";
import type { ArchiveItem } from "@/components/education/archive";

vi.mock("@/lib/storage/materials-db");
vi.mock("@/components/education/archive/utils");
vi.mock("@/lib/logger");

const mockMaterials: ArchiveItem[] = [
  {
    id: "1",
    toolId: "tool-1",
    toolType: "flashcard",
    title: "Math flashcards",
    content: {},
    status: "active",
    subject: "Mathematics",
    maestroId: "euclide",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    isBookmarked: true,
    userRating: 5,
    viewCount: 10,
  },
  {
    id: "2",
    toolId: "tool-2",
    toolType: "quiz",
    title: "Science quiz",
    content: {},
    status: "active",
    subject: "Science",
    maestroId: "galileo",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
    isBookmarked: false,
    userRating: 3,
    viewCount: 5,
  },
  {
    id: "3",
    toolId: "tool-3",
    toolType: "flashcard",
    title: "History flashcards",
    content: {},
    status: "active",
    subject: "History",
    maestroId: "erodoto",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
    isBookmarked: true,
    userRating: 4,
    viewCount: 8,
  },
];

describe("useMaterialsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(materialsDb.getActiveMaterials).mockResolvedValue(mockMaterials);
    vi.mocked(archiveUtils.updateMaterialInteraction).mockResolvedValue(true);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should load materials on mount", async () => {
    const { result } = renderHook(() => useMaterialsView());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.materials).toHaveLength(3);
    expect(materialsDb.getActiveMaterials).toHaveBeenCalledTimes(1);
  });

  it("should filter by type", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setTypeFilter("flashcard");
    });

    expect(result.current.filtered).toHaveLength(2);
    expect(
      result.current.filtered.every((m) => m.toolType === "flashcard"),
    ).toBe(true);
  });

  it("should filter by bookmarked", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setTypeFilter("bookmarked");
    });

    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.every((m) => m.isBookmarked)).toBe(true);
  });

  it("should filter by subject", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSubjectFilter("Mathematics");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].subject).toBe("Mathematics");
  });

  it("should sort by date (newest first)", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSortBy("date");
    });

    const dates = result.current.filtered.map((m) =>
      new Date(m.createdAt).getTime(),
    );
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it("should sort by rating", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSortBy("rating");
    });

    const ratings = result.current.filtered.map((m) => m.userRating || 0);
    expect(ratings).toEqual([5, 4, 3]);
  });

  it("should search materials with debounce", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    vi.useFakeTimers();

    act(() => {
      result.current.setSearchQuery("Math");
    });

    // Query not yet debounced
    expect(result.current.filtered).toHaveLength(3);

    // Fast-forward 200ms
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Now search should be applied
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].title).toBe("Math flashcards");
  });

  it("should toggle bookmark", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleBookmark("tool-2", true);
    });

    const updated = result.current.materials.find((m) => m.toolId === "tool-2");
    expect(updated?.isBookmarked).toBe(true);
  });

  it("should update rating", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleRate("tool-2", 5);
    });

    const updated = result.current.materials.find((m) => m.toolId === "tool-2");
    expect(updated?.userRating).toBe(5);
  });

  it("should delete material", async () => {
    vi.mocked(materialsDb.deleteMaterial).mockResolvedValue(undefined);
    global.confirm = vi.fn(() => true);

    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDelete("tool-1");
    });

    expect(result.current.materials).toHaveLength(2);
    expect(
      result.current.materials.find((m) => m.toolId === "tool-1"),
    ).toBeUndefined();
  });

  it("should compute available subjects", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.availableSubjects).toEqual([
      "History",
      "Mathematics",
      "Science",
    ]);
  });

  it("should track active filters", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.setTypeFilter("flashcard");
    });

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("should clear all filters", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setTypeFilter("flashcard");
      result.current.setSubjectFilter("Mathematics");
      result.current.setSearchQuery("test");
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.typeFilter).toBe("all");
    expect(result.current.subjectFilter).toBeNull();
    expect(result.current.searchQuery).toBe("");
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("should compute counts by type", async () => {
    const { result } = renderHook(() => useMaterialsView());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.counts.total).toBe(3);
    expect(result.current.counts.bookmarked).toBe(2);
    expect(result.current.counts.byType.flashcard).toBe(2);
    expect(result.current.counts.byType.quiz).toBe(1);
  });

  it("should apply custom date filter when provided", async () => {
    const dateFilterFn = (materials: ArchiveItem[]) =>
      materials.filter((m) => new Date(m.createdAt) >= new Date("2024-01-15"));

    const { result } = renderHook(() => useMaterialsView({ dateFilterFn }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have 2 materials (Jan 15 and Jan 20, excluding Jan 10)
    expect(result.current.filtered).toHaveLength(2);
  });
});
