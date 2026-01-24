/**
 * useTierFeatures Hook - Fetch and cache user tier features
 *
 * Features:
 * - Fetches user's tier and available features on mount
 * - Caches features to avoid repeated API calls
 * - Provides hasFeature() method for checking feature access
 * - Returns tier name, features object, and loading state
 * - Handles errors gracefully with sensible defaults
 * - Cleans up on component unmount to prevent memory leaks
 *
 * Usage:
 * ```tsx
 * const { hasFeature, tier, features, isLoading } = useTierFeatures();
 *
 * if (isLoading) return <Spinner />;
 *
 * if (hasFeature('voice')) {
 *   // Show voice feature
 * }
 *
 * console.log(`User tier: ${tier}`);
 * ```
 */

import { useState, useEffect } from "react";

interface TierFeaturesData {
  tier: string;
  features: Record<string, boolean>;
}

interface UseTierFeaturesReturn {
  hasFeature: (featureKey: string) => boolean;
  isLoading: boolean;
  tier: string | undefined;
  features: Record<string, boolean>;
}

// Global cache to share features across hook instances
const featureCache = new Map<
  string,
  TierFeaturesData & { timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clear the feature cache (for testing purposes)
 * @internal
 */
export function clearTierFeaturesCache(): void {
  featureCache.clear();
}

/**
 * Hook to fetch and check user tier features
 *
 * @returns Object with hasFeature method, tier info, and loading state
 */
export function useTierFeatures(): UseTierFeaturesReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [tier, setTier] = useState<string | undefined>();
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    async function fetchTierFeatures() {
      try {
        // Check cache first
        const cacheKey = "tier-features";
        const cached = featureCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          // Use cached data
          if (isMounted) {
            setTier(cached.tier);
            setFeatures(cached.features);
            setIsLoading(false);
          }
          return;
        }

        // Fetch from API
        const response = await fetch("/api/user/tier-features");

        if (!response.ok) {
          if (isMounted) {
            setTier(undefined);
            setFeatures({});
            setIsLoading(false);
          }
          return;
        }

        const data = (await response.json()) as TierFeaturesData;

        // Update cache
        featureCache.set(cacheKey, {
          ...data,
          timestamp: Date.now(),
        });

        if (isMounted) {
          setTier(data.tier);
          setFeatures(data.features);
          setIsLoading(false);
        }
      } catch (_error) {
        if (isMounted) {
          setTier(undefined);
          setFeatures({});
          setIsLoading(false);
        }
      }
    }

    fetchTierFeatures();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Check if a feature is enabled for the user's tier
   * @param featureKey - The feature key to check
   * @returns true if feature is enabled, false otherwise
   */
  const hasFeature = (featureKey: string): boolean => {
    return features[featureKey] ?? false;
  };

  return {
    hasFeature,
    isLoading,
    tier,
    features,
  };
}
