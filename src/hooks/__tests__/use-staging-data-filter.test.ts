/**
 * MIRRORBUDDY - Use Staging Data Filter Hook Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStagingDataFilter } from "../use-staging-data-filter";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("useStagingDataFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it("should initialize with showStagingData as false (default)", () => {
    const { result } = renderHook(() => useStagingDataFilter());

    expect(result.current.showStagingData).toBe(false);
  });

  it("should provide a toggle function to change showStagingData", () => {
    const { result } = renderHook(() => useStagingDataFilter());

    expect(result.current.showStagingData).toBe(false);

    act(() => {
      result.current.setShowStagingData(true);
    });

    expect(result.current.showStagingData).toBe(true);
  });

  it("should return empty filter clause when showStagingData is true", () => {
    const { result } = renderHook(() => useStagingDataFilter());

    act(() => {
      result.current.setShowStagingData(true);
    });

    expect(result.current.filterClause).toEqual({});
  });

  it("should return isTestData: false filter clause when showStagingData is false", () => {
    const { result } = renderHook(() => useStagingDataFilter());

    expect(result.current.showStagingData).toBe(false);
    expect(result.current.filterClause).toEqual({ isTestData: false });
  });

  it("should toggle between true and false", () => {
    const { result } = renderHook(() => useStagingDataFilter());

    expect(result.current.showStagingData).toBe(false);

    act(() => {
      result.current.setShowStagingData(true);
    });
    expect(result.current.showStagingData).toBe(true);

    act(() => {
      result.current.setShowStagingData(false);
    });
    expect(result.current.showStagingData).toBe(false);
  });

  it("should persist showStagingData to localStorage", () => {
    const { result } = renderHook(() => useStagingDataFilter());

    act(() => {
      result.current.setShowStagingData(true);
    });

    expect(localStorageMock.getItem("mirrorbuddy-show-staging-data")).toBe(
      "true",
    );

    act(() => {
      result.current.setShowStagingData(false);
    });

    expect(localStorageMock.getItem("mirrorbuddy-show-staging-data")).toBe(
      "false",
    );
  });

  it("should load showStagingData from localStorage during initialization", () => {
    localStorageMock.setItem("mirrorbuddy-show-staging-data", "true");

    const { result } = renderHook(() => useStagingDataFilter());

    expect(result.current.showStagingData).toBe(true);
    expect(localStorageMock.getItem("mirrorbuddy-show-staging-data")).toBe(
      "true",
    );
  });

  it("should handle invalid localStorage value gracefully", () => {
    localStorageMock.setItem("mirrorbuddy-show-staging-data", "invalid");

    const { result } = renderHook(() => useStagingDataFilter());

    expect(result.current.showStagingData).toBe(false);
  });
});
