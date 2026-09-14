'use client';

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/auth';
import { getClientIdentity, requireClientUserId } from '@/lib/auth/client-auth';
import { useClientIdentity } from '@/lib/auth/identity-provider';

const CHECK_INTERVAL_MS = 60000;

export function useParentInsightsIndicator() {
  const identity = useClientIdentity();
  const [hasNewInsights, setHasNewInsights] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkForNewInsights = useCallback(async () => {
    if (identity.status !== 'authenticated') return;
    setIsLoading(true);
    try {
      const lastViewedResponse = await fetch('/api/profile/last-viewed');
      if (!lastViewedResponse.ok) throw new Error('INSIGHTS_UNAVAILABLE');
      const lastViewedData = await lastViewedResponse.json();
      const response = await fetch('/api/learnings?limit=1');
      if (!response.ok) throw new Error('INSIGHTS_UNAVAILABLE');
      const data = await response.json();
      if (getClientIdentity() !== identity) return;
      const latest = data?.learnings?.[0]?.createdAt;
      setHasNewInsights(
        Boolean(latest && new Date(latest) > new Date(lastViewedData?.lastViewed || 0)),
      );
      setError(null);
    } catch {
      if (getClientIdentity() === identity) setError('INSIGHTS_UNAVAILABLE');
    } finally {
      if (getClientIdentity() === identity) setIsLoading(false);
    }
  }, [identity]);

  const markAsViewed = useCallback(async () => {
    try {
      requireClientUserId();
      const response = await csrfFetch('/api/profile/last-viewed', {
        method: 'POST',
        body: JSON.stringify({ timestamp: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error('INSIGHTS_UNAVAILABLE');
      setHasNewInsights(false);
    } catch {
      setError('INSIGHTS_UNAVAILABLE');
    }
  }, []);

  useEffect(() => {
    void checkForNewInsights();
    const interval = setInterval(() => {
      void checkForNewInsights();
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkForNewInsights]);

  return {
    hasNewInsights: identity.status === 'authenticated' && hasNewInsights,
    isLoading: identity.status === 'pending' || (identity.status === 'authenticated' && isLoading),
    error: identity.status === 'unavailable' ? identity.reason : error,
    markAsViewed,
    refresh: checkForNewInsights,
  };
}
