'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';
import {
  hasAnalyticsConsent,
  onAnalyticsRevoked,
  sendOptionalAnalytics,
} from './optional-analytics-client';

let activityId: string | null = null;
onAnalyticsRevoked(() => {
  activityId = null;
});

/**
 * Tracks consented activity using a credential-free, memory-only identifier.
 *
 * Usage: Add <ActivityTracker /> to your root layout.
 */
export function useActivityTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasAnalyticsConsent() || !pathname) {
      lastPathRef.current = null;
      return;
    }
    // Skip if same path (prevent double tracking)
    if (pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;

    // Skip static routes that don't need tracking
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg')
    ) {
      return;
    }

    activityId ??= crypto.randomUUID();
    void sendOptionalAnalytics('/api/telemetry/activity', { route: pathname, activityId }).catch(
      (error: unknown) => {
        logger.warn('Optional activity request failed', { error: String(error) });
      },
    );
  }, [pathname]);
}

/**
 * Activity Tracker component - add to root layout
 */
export function ActivityTracker() {
  useActivityTracker();
  return null;
}
