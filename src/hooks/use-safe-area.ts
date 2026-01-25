"use client";

/**
 * Safe area inset values in pixels
 */
export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Helper function to parse pixel values from CSS custom properties
 */
function parsePixelValue(value: string): number {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "") {
    return 0;
  }

  // Extract the numeric value from "XXpx" format
  const match = trimmed.match(/^([\d.]+)px$/);
  if (match) {
    const parsed = parseFloat(match[1]);
    return isNaN(parsed) ? 0 : Math.round(parsed);
  }

  // If it's just a number, parse it
  const numValue = parseFloat(trimmed);
  return isNaN(numValue) ? 0 : Math.round(numValue);
}

/**
 * Hook to access iOS safe area insets
 *
 * Returns the computed safe area inset values from CSS custom properties
 * defined in safe-area.css. These are populated by the browser on iOS Safari
 * when viewport-fit=cover is set in the viewport meta tag.
 *
 * @example
 * ```tsx
 * const safeArea = useSafeArea();
 *
 * return (
 *   <div style={{ paddingTop: safeArea.top }}>
 *     Content with safe area padding
 *   </div>
 * );
 * ```
 *
 * @see https://developer.apple.com/documentation/webkit/supporting_safe_areas
 * @returns SafeAreaInsets object with top, bottom, left, right values in pixels
 */
export function useSafeArea(): SafeAreaInsets {
  // Only run in browser
  if (typeof window === "undefined") {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const root = document.documentElement;
  const styles = getComputedStyle(root);

  return {
    top: parsePixelValue(styles.getPropertyValue("--safe-area-inset-top")),
    bottom: parsePixelValue(
      styles.getPropertyValue("--safe-area-inset-bottom"),
    ),
    left: parsePixelValue(styles.getPropertyValue("--safe-area-inset-left")),
    right: parsePixelValue(styles.getPropertyValue("--safe-area-inset-right")),
  };
}
