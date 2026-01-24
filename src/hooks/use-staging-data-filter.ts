"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "mirrorbuddy-show-staging-data";

export function useStagingDataFilter() {
  const [showStagingData, setShowStagingData] = useState(() => {
    // Initialize from localStorage during render
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  const setShowStagingDataWithStorage = useCallback((value: boolean) => {
    setShowStagingData(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Fail silently if localStorage is unavailable
    }
  }, []);

  return {
    showStagingData,
    setShowStagingData: setShowStagingDataWithStorage,
    filterClause: showStagingData ? {} : { isTestData: false },
  };
}
