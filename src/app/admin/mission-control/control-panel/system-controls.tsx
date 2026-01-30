"use client";

/**
 * System Controls Component
 * Manages maintenance mode and global kill switch
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MaintenanceModeState,
  GlobalKillSwitchState,
} from "@/lib/admin/control-panel-types";
import { csrfFetch } from "@/lib/auth/csrf-client";

interface SystemControlsProps {
  maintenanceMode: MaintenanceModeState;
  globalKillSwitch: GlobalKillSwitchState;
  onUpdate: (type: "maintenance" | "kill-switch") => void;
}

export function SystemControls({
  maintenanceMode,
  globalKillSwitch,
  onUpdate,
}: SystemControlsProps) {
  const [loading, setLoading] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    maintenanceMode.customMessage,
  );
  const [maintenanceSeverity, setMaintenanceSeverity] = useState<
    "low" | "medium" | "high"
  >(maintenanceMode.severity);
  const [estimatedEndTime, setEstimatedEndTime] = useState("");

  const handleMaintenanceToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      const response = await csrfFetch("/api/admin/control-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "maintenance",
          data: {
            isEnabled: enabled,
            customMessage: maintenanceMessage,
            severity: maintenanceSeverity,
            estimatedEndTime: estimatedEndTime || undefined,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update maintenance mode");
      }

      onUpdate("maintenance");
      setShowMaintenanceModal(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error updating maintenance mode:", error);
      alert("Failed to update maintenance mode");
    } finally {
      setLoading(false);
    }
  };

  const handleKillSwitchToggle = async () => {
    if (!window.confirm("Are you sure? This will shut down the system.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await csrfFetch("/api/admin/control-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "kill-switch",
          data: {
            isEnabled: !globalKillSwitch.isEnabled,
            reason: globalKillSwitch.isEnabled
              ? "Restarting"
              : "Emergency shutdown",
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle kill switch");
      }

      onUpdate("kill-switch");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error toggling kill switch:", error);
      alert("Failed to toggle kill switch");
    } finally {
      setLoading(false);
    }
  };

  const _getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low":
        return "bg-blue-100 text-blue-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                Status:{" "}
                <Badge
                  className={
                    maintenanceMode.isEnabled
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }
                >
                  {maintenanceMode.isEnabled ? "Active" : "Inactive"}
                </Badge>
              </p>
              {maintenanceMode.isEnabled && (
                <p className="text-sm text-gray-600 mt-1">
                  {maintenanceMode.customMessage}
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowMaintenanceModal(true)}
              variant={maintenanceMode.isEnabled ? "destructive" : "default"}
            >
              {maintenanceMode.isEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showMaintenanceModal && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Maintenance Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Message</label>
              <input
                type="text"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="e.g., System maintenance in progress..."
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Severity</label>
              <select
                value={maintenanceSeverity}
                onChange={(e) =>
                  setMaintenanceSeverity(
                    e.target.value as "low" | "medium" | "high",
                  )
                }
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Estimated End Time (optional)
              </label>
              <input
                type="datetime-local"
                value={estimatedEndTime}
                onChange={(e) => setEstimatedEndTime(e.target.value)}
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleMaintenanceToggle(true)}
                disabled={loading}
              >
                Enable Maintenance
              </Button>
              <Button
                onClick={() => setShowMaintenanceModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Global Kill Switch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                Status:{" "}
                <Badge
                  className={
                    globalKillSwitch.isEnabled
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }
                >
                  {globalKillSwitch.isEnabled ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </p>
              {globalKillSwitch.reason && (
                <p className="text-sm text-red-700 mt-1">
                  Reason: {globalKillSwitch.reason}
                </p>
              )}
            </div>
            <Button
              onClick={handleKillSwitchToggle}
              disabled={loading}
              variant="destructive"
            >
              {globalKillSwitch.isEnabled ? "Reactivate" : "Activate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
