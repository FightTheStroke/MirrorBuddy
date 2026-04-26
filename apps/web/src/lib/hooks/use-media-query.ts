"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect media query matches (e.g., for responsive design)
 * Useful for implementing mobile-first accordion and collapsible patterns
 *
 * SSR-safe: Returns false during SSR and initial hydration to avoid mismatch,
 * then updates to the actual value after client-side mount.
 *
 * @param query - CSS media query string (e.g., "(max-width: 640px)")
 * @returns boolean indicating if the media query matches
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 640px)');
 * const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query: string): boolean {
  // Initialize to false for SSR consistency - prevents hydration mismatch
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(query);

    // Set initial state from the query result
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches(mediaQueryList.matches);

    // Update matches when media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add listener for changes
    mediaQueryList.addEventListener("change", handleChange);

    // Cleanup
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
