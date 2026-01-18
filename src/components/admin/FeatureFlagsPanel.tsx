/**
 * Feature Flags Admin Panel
 *
 * V1Plan FASE 2.0.6: Admin UI for feature flag management
 */

"use client";

import { useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/lib/hooks/use-feature-flags";
import { csrfFetch } from "@/lib/auth/csrf-client";
import type { FeatureFlag, KnownFeatureFlag } from "@/lib/feature-flags/types";

interface FeatureFlagsPanelProps {
  onFlagUpdate?: (featureId: string, enabled: boolean) => void;
}

export function FeatureFlagsPanel({ onFlagUpdate }: FeatureFlagsPanelProps) {
  const { flags, globalKillSwitch, degradationState, refresh, isLoading } =
    useFeatureFlags();
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggleKillSwitch = useCallback(
    async (featureId: KnownFeatureFlag, currentKillSwitch: boolean) => {
      setUpdating(featureId);
      setError(null);

      try {
        const response = await csrfFetch("/api/admin/feature-flags", {
          method: "POST",
          body: JSON.stringify({
            featureId,
            enabled: !currentKillSwitch,
            reason: currentKillSwitch
              ? "Manual reactivation"
              : "Manual kill-switch",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update flag");
        }

        refresh();
        onFlagUpdate?.(featureId, currentKillSwitch);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setUpdating(null);
      }
    },
    [refresh, onFlagUpdate],
  );

  const handleGlobalKillSwitch = useCallback(async () => {
    setUpdating("global");
    setError(null);

    try {
      const response = await csrfFetch("/api/admin/feature-flags", {
        method: "POST",
        body: JSON.stringify({
          global: true,
          enabled: !globalKillSwitch,
          reason: globalKillSwitch
            ? "Global reactivation"
            : "Global emergency stop",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle global kill-switch");
      }

      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUpdating(null);
    }
  }, [globalKillSwitch, refresh]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-8 bg-gray-200 rounded" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global Status Card */}
      <Card className={globalKillSwitch ? "border-red-500" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>System Status</span>
            <StatusBadge
              status={
                globalKillSwitch
                  ? "critical"
                  : degradationState.level === "none"
                    ? "healthy"
                    : degradationState.level
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {globalKillSwitch
                  ? "All features disabled via global kill-switch"
                  : degradationState.level !== "none"
                    ? `System in ${degradationState.level} degradation`
                    : "All systems operational"}
              </p>
            </div>
            <Button
              variant={globalKillSwitch ? "default" : "destructive"}
              size="sm"
              onClick={handleGlobalKillSwitch}
              disabled={updating === "global"}
            >
              {updating === "global"
                ? "..."
                : globalKillSwitch
                  ? "Reactivate All"
                  : "Global Kill-Switch"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-700 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Feature Flags List */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags ({flags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {flags.map((flag) => (
              <FeatureFlagRow
                key={flag.id}
                flag={flag}
                onToggle={() =>
                  handleToggleKillSwitch(
                    flag.id as KnownFeatureFlag,
                    flag.killSwitch,
                  )
                }
                isUpdating={updating === flag.id}
                globalDisabled={globalKillSwitch}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components

interface FeatureFlagRowProps {
  flag: FeatureFlag;
  onToggle: () => void;
  isUpdating: boolean;
  globalDisabled: boolean;
}

function FeatureFlagRow({
  flag,
  onToggle,
  isUpdating,
  globalDisabled,
}: FeatureFlagRowProps) {
  const isDisabled =
    flag.killSwitch || globalDisabled || flag.status === "disabled";

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${
        isDisabled ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            flag.killSwitch
              ? "bg-red-500"
              : flag.status === "degraded"
                ? "bg-yellow-500"
                : flag.status === "enabled"
                  ? "bg-green-500"
                  : "bg-gray-400"
          }`}
        />
        <div>
          <p className="font-medium text-sm">{flag.name}</p>
          <p className="text-xs text-muted-foreground">{flag.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {flag.enabledPercentage < 100 && (
          <span className="text-xs text-muted-foreground">
            {flag.enabledPercentage}% rollout
          </span>
        )}

        <Button
          variant={flag.killSwitch ? "default" : "outline"}
          size="sm"
          onClick={onToggle}
          disabled={isUpdating || globalDisabled}
        >
          {isUpdating ? "..." : flag.killSwitch ? "Enable" : "Disable"}
        </Button>
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: "healthy" | "partial" | "severe" | "critical";
}

function StatusBadge({ status }: StatusBadgeProps) {
  const colors = {
    healthy: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    severe: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  const labels = {
    healthy: "Healthy",
    partial: "Partial",
    severe: "Severe",
    critical: "Critical",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default FeatureFlagsPanel;
