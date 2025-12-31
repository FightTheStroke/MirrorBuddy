'use client';

import { useState, useEffect, useCallback } from 'react';

const LAST_VIEWED_KEY = 'parent-dashboard-last-viewed';
const CHECK_INTERVAL_MS = 60000; // Check every minute

/**
 * Hook to track if there are new insights since the parent dashboard was last viewed.
 * Used to show a badge on the Genitori navigation item.
 */
export function useParentInsightsIndicator() {
  const [hasNewInsights, setHasNewInsights] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkForNewInsights = useCallback(async () => {
    try {
      const lastViewed = localStorage.getItem(LAST_VIEWED_KEY);
      const lastViewedDate = lastViewed ? new Date(lastViewed) : new Date(0);

      // Fetch latest learning entries
      const response = await fetch('/api/learnings?limit=1');
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
  const markAsViewed = useCallback(() => {
    localStorage.setItem(LAST_VIEWED_KEY, new Date().toISOString());
    setHasNewInsights(false);
  }, []);

  // Check on mount and periodically
  useEffect(() => {
    checkForNewInsights();

    const interval = setInterval(checkForNewInsights, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkForNewInsights]);

  return { hasNewInsights, isLoading, markAsViewed, refresh: checkForNewInsights };
}
