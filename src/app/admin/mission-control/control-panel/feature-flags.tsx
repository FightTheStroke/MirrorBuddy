"use client";

/**
 * Feature Flags Component
 * Allows toggling feature flags and managing enablement percentage
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeatureFlagState } from "@/lib/admin/control-panel-types";
import { csrfFetch } from "@/lib/auth/csrf-client";

interface FeatureFlagsProps {
  flags: FeatureFlagState[];
  onUpdate: (flagId: string, status: string) => void;
}

export function FeatureFlags({ flags, onUpdate }: FeatureFlagsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
  const [percentages, setPercentages] = useState<Record<string, number>>({});

  const handleToggle = async (flagId: string, newStatus: string) => {
    setLoading(flagId);
    try {
      const response = await csrfFetch("/api/admin/control-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "feature-flag",
          data: {
            flagId,
            update: {
              status: newStatus as "enabled" | "disabled" | "degraded",
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update feature flag");
      }

      onUpdate(flagId, newStatus);
    } catch (error) {
      console.error("Error updating feature flag:", error);
      alert("Failed to update feature flag");
    } finally {
      setLoading(null);
    }
  };

  const handlePercentageChange = async (flagId: string) => {
    const percentage = percentages[flagId] || 0;
    setLoading(flagId);
    try {
      const response = await csrfFetch("/api/admin/control-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "feature-flag",
          data: {
            flagId,
            update: {
              enabledPercentage: percentage,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update percentage");
      }
    } catch (error) {
      console.error("Error updating percentage:", error);
      alert("Failed to update percentage");
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadgeColor = (
    status: "enabled" | "disabled" | "degraded",
  ) => {
    switch (status) {
      case "enabled":
        return "bg-green-100 text-green-800";
      case "disabled":
        return "bg-red-100 text-red-800";
      case "degraded":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Flags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {flags.map((flag) => (
          <div
            key={flag.id}
            className="border rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{flag.name}</h3>
                <p className="text-sm text-gray-600">{flag.description}</p>
              </div>
              <Badge className={getStatusBadgeColor(flag.status)}>
                {flag.status}
              </Badge>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={flag.status === "enabled" ? "default" : "outline"}
                onClick={() => handleToggle(flag.id, "enabled")}
                disabled={loading === flag.id}
              >
                Enable
              </Button>
              <Button
                size="sm"
                variant={flag.status === "disabled" ? "default" : "outline"}
                onClick={() => handleToggle(flag.id, "disabled")}
                disabled={loading === flag.id}
              >
                Disable
              </Button>
              <Button
                size="sm"
                variant={flag.status === "degraded" ? "default" : "outline"}
                onClick={() => handleToggle(flag.id, "degraded")}
                disabled={loading === flag.id}
              >
                Degraded
              </Button>
            </div>

            {flag.killSwitch && (
              <div className="bg-red-50 border border-red-200 p-2 rounded text-sm text-red-700">
                Kill switch: {flag.killSwitchReason || "No reason provided"}
              </div>
            )}

            <button
              onClick={() =>
                setExpandedFlag(
                  expandedFlag === flag.id ? null : flag.id,
                )
              }
              className="text-sm text-blue-600 hover:underline"
            >
              {expandedFlag === flag.id ? "Hide" : "Show"} Rollout Options
            </button>

            {expandedFlag === flag.id && (
              <div className="bg-gray-50 p-3 rounded space-y-2">
                <div>
                  <label className="text-sm font-medium">
                    Enabled Percentage: {percentages[flag.id] ?? flag.enabledPercentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={percentages[flag.id] ?? flag.enabledPercentage}
                    onChange={(e) =>
                      setPercentages({
                        ...percentages,
                        [flag.id]: parseInt(e.target.value),
                      })
                    }
                    className="w-full mt-1"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => handlePercentageChange(flag.id)}
                  disabled={loading === flag.id}
                >
                  Save Percentage
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
