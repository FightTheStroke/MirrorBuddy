"use client";

/**
 * Control Panel Page
 * Admin dashboard for managing features, maintenance, kill switch, and tier limits
 */

import { useEffect, useState } from "react";
import { FeatureFlags } from "./feature-flags";
import { SystemControls } from "./system-controls";
import { TierLimits } from "./tier-limits";
import {
  ControlPanelState,
  FeatureFlagState,
  MaintenanceModeState,
  GlobalKillSwitchState,
  TierLimitConfig,
} from "@/lib/admin/control-panel-types";

export const dynamic = "force-dynamic";

export default function ControlPanelPage() {
  const [state, setState] = useState<ControlPanelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadControlPanelState();
  }, []);

  const loadControlPanelState = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/control-panel");

      if (!response.ok) {
        throw new Error("Failed to fetch control panel state");
      }

      const data = await response.json();
      setState(data.data);
      setError(null);
    } catch (err) {
      console.error("Error loading control panel:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load control panel",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (
    type: "feature-flag" | "maintenance" | "kill-switch" | "tier-limit",
  ) => {
    await loadControlPanelState();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading control panel...</div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-lg font-semibold text-red-600">{error || "Failed to load control panel"}</div>
        <button
          onClick={loadControlPanelState}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Control Panel</h1>
        <p className="text-gray-600">
          Manage feature flags, maintenance mode, kill switch, and tier limits
        </p>
      </div>

      <div className="grid gap-8">
        <SystemControls
          maintenanceMode={state.maintenanceMode}
          globalKillSwitch={state.globalKillSwitch}
          onUpdate={handleUpdate}
        />

        <FeatureFlags
          flags={state.featureFlags}
          onUpdate={(flagId) => handleUpdate("feature-flag")}
        />

        <TierLimits
          tiers={state.tierLimits}
          onUpdate={(tierId) => handleUpdate("tier-limit")}
        />
      </div>
    </div>
  );
}
