// ============================================================================
// FEATURE FLAGS HOOK
// React hook for feature flag checks with real-time updates
// ============================================================================

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  KnownFeatureFlag,
  FeatureFlag,
  FeatureFlagCheckResult,
} from "@/lib/feature-flags/types";
import {
  isFeatureEnabled,
  getAllFlags,
  getFlag,
  isGlobalKillSwitchActive,
} from "@/lib/feature-flags";
import { getDegradationState, getFallbackBehavior } from "@/lib/degradation";
import type {
  DegradationState,
  FallbackBehavior,
} from "@/lib/degradation/types";

interface UseFeatureFlagsReturn {
  // Check if feature is enabled
  isEnabled: (featureId: KnownFeatureFlag) => boolean;
  // Get detailed check result
  checkFeature: (featureId: KnownFeatureFlag) => FeatureFlagCheckResult;
  // Get all flags
  flags: FeatureFlag[];
  // Global kill-switch status
  globalKillSwitch: boolean;
  // Degradation state
  degradationState: DegradationState;
  // Get fallback behavior for a feature
  getFallback: (featureId: KnownFeatureFlag) => FallbackBehavior | null;
  // Is system in degraded mode
  isDegraded: boolean;
  // Refresh flags (manual)
  refresh: () => void;
  // Loading state
  isLoading: boolean;
}

// Poll interval for checking flag updates
const POLL_INTERVAL_MS = 30000; // 30 seconds

export function useFeatureFlags(userId?: string): UseFeatureFlagsReturn {
  // Initialize with current values (synchronous)
  const [flags, setFlags] = useState<FeatureFlag[]>(() => getAllFlags());
  const [globalKillSwitch, setGlobalKillSwitch] = useState(() =>
    isGlobalKillSwitchActive(),
  );
  const [degradationState, setDegradationState] = useState<DegradationState>(
    () => getDegradationState(),
  );
  const [isLoading, _setIsLoading] = useState(false);

  // Refresh function for manual updates and polling
  const loadState = useCallback(() => {
    setFlags(getAllFlags());
    setGlobalKillSwitch(isGlobalKillSwitchActive());
    setDegradationState(getDegradationState());
  }, []);

  // Periodic refresh only
  useEffect(() => {
    const interval = setInterval(loadState, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadState]);

  // Check if feature is enabled
  const isEnabled = useCallback(
    (featureId: KnownFeatureFlag): boolean => {
      const result = isFeatureEnabled(featureId, userId);
      return result.enabled;
    },
    [userId],
  );

  // Get detailed check result
  const checkFeature = useCallback(
    (featureId: KnownFeatureFlag): FeatureFlagCheckResult => {
      return isFeatureEnabled(featureId, userId);
    },
    [userId],
  );

  // Get fallback behavior for degraded feature
  const getFallback = useCallback(
    (featureId: KnownFeatureFlag): FallbackBehavior | null => {
      return getFallbackBehavior(featureId);
    },
    [],
  );

  // Is system degraded - recompute when degradation state changes
  const isDegraded = useMemo(
    () => degradationState.level !== "none",
    [degradationState.level],
  );

  return {
    isEnabled,
    checkFeature,
    flags,
    globalKillSwitch,
    degradationState,
    getFallback,
    isDegraded,
    refresh: loadState,
    isLoading,
  };
}

/**
 * Simple hook for checking a single feature
 */
export function useFeatureFlag(
  featureId: KnownFeatureFlag,
  userId?: string,
): {
  enabled: boolean;
  flag: FeatureFlag | undefined;
  reason: FeatureFlagCheckResult["reason"];
  fallback: FallbackBehavior | null;
} {
  const [result, setResult] = useState<FeatureFlagCheckResult | null>(null);
  const [fallback, setFallback] = useState<FallbackBehavior | null>(null);

  useEffect(() => {
    const check = () => {
      setResult(isFeatureEnabled(featureId, userId));
      setFallback(getFallbackBehavior(featureId));
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [featureId, userId]);

  return {
    enabled: result?.enabled ?? false,
    flag: result?.flag ?? getFlag(featureId),
    reason: result?.reason ?? "disabled",
    fallback,
  };
}

/**
 * HOC for conditionally rendering based on feature flag
 */
export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureId: KnownFeatureFlag,
  FallbackComponent?: React.ComponentType<P>,
): React.FC<P & { userId?: string }> {
  return function FeatureFlagWrapper(props: P & { userId?: string }) {
    const { userId, ...rest } = props;
    const { enabled } = useFeatureFlag(featureId, userId);

    if (!enabled) {
      if (FallbackComponent) {
        return <FallbackComponent {...(rest as P)} />;
      }
      return null;
    }

    return <WrappedComponent {...(rest as P)} />;
  };
}
