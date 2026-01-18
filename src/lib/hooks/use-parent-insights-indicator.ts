"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfFetch } from "@/lib/auth/csrf-client";

const CHECK_INTERVAL_MS = 60000; // Check every minute

/**
 * Hook to track if there are new insights since the parent dashboard was last viewed.
 * Uses database for persistence via /api/profile/last-viewed endpoint.
 * Shows a badge on the Genitori navigation item.
 */
export function useParentInsightsIndicator() {
  const [hasNewInsights, setHasNewInsights] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkForNewInsights = useCallback(async () => {
    try {
      // Get last viewed timestamp from database
      const lastViewedResponse = await fetch("/api/profile/last-viewed");
      let lastViewedDate = new Date(0);
      if (lastViewedResponse.ok) {
        const lastViewedData = await lastViewedResponse.json();
        if (lastViewedData.lastViewed) {
          lastViewedDate = new Date(lastViewedData.lastViewed);
        }
      }

      // Fetch latest learning entries
      const response = await fetch("/api/learnings?limit=1");
      if (!response.ok) {
        setHasNewInsights(false);
        return;
      }

      const data = await response.json();
      if (data.learnings && data.learnings.length > 0) {
        const latestEntry = data.learnings[0];
        const latestDate = new Date(latestEntry.createdAt);
        setHasNewInsights(latestDate > lastViewedDate);
      } else {
        setHasNewInsights(false);
      }
    } catch {
      setHasNewInsights(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark as viewed - call this when user visits parent dashboard
  const markAsViewed = useCallback(async () => {
    try {
      await csrfFetch("/api/profile/last-viewed", {
        method: "POST",
        body: JSON.stringify({ timestamp: new Date().toISOString() }),
      });
      setHasNewInsights(false);
    } catch {
      // Silently fail - not critical
    }
  }, []);

  // Check on mount and periodically
  useEffect(() => {
    checkForNewInsights();

    const interval = setInterval(checkForNewInsights, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkForNewInsights]);

  return {
    hasNewInsights,
    isLoading,
    markAsViewed,
    refresh: checkForNewInsights,
  };
}
