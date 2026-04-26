"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Tracks user activity by sending beacon to the telemetry endpoint.
 * Uses sendBeacon for reliable delivery even on page unload.
 *
 * Usage: Add <ActivityTracker /> to your root layout.
 */
export function useActivityTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if same path (prevent double tracking)
    if (pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;

    // Skip static routes that don't need tracking
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.endsWith(".ico") ||
      pathname.endsWith(".png") ||
      pathname.endsWith(".jpg")
    ) {
      return;
    }

    // Use sendBeacon for reliable delivery (doesn't block navigation)
    const data = JSON.stringify({ route: pathname });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/telemetry/activity", data);
    } else {
      // Fallback for older browsers
      fetch("/api/telemetry/activity", {
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {
        // Silent failure
      });
    }
  }, [pathname]);
}

/**
 * Activity Tracker component - add to root layout
 */
export function ActivityTracker() {
  useActivityTracker();
  return null;
}
