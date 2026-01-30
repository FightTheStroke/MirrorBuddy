/**
 * Health Status UI Utilities
 * Shared components and helpers for displaying service health status
 */

import { CheckCircle2, AlertCircle, XCircle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ServiceStatus } from "@/lib/admin/health-aggregator-types";

interface StatusBadgeProps {
  status: ServiceStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const variant = getStatusVariant(status);
  const label = getStatusLabel(status);
  const colorClass =
    status === "down"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "";

  return (
    <Badge variant={variant} className={`${colorClass} ${className}`}>
      {label}
    </Badge>
  );
}

interface StatusIconProps {
  status: ServiceStatus;
  className?: string;
}

export function StatusIcon({ status, className = "h-5 w-5" }: StatusIconProps) {
  const color = getStatusColor(status);

  switch (status) {
    case "healthy":
      return <CheckCircle2 className={`${className} ${color}`} />;
    case "degraded":
      return <AlertCircle className={`${className} ${color}`} />;
    case "down":
      return <XCircle className={`${className} ${color}`} />;
    case "unknown":
      return <HelpCircle className={`${className} ${color}`} />;
  }
}

function getStatusVariant(
  status: ServiceStatus,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "healthy":
      return "default";
    case "degraded":
      return "secondary";
    case "down":
      return "secondary";
    case "unknown":
      return "outline";
  }
}

function getStatusLabel(status: ServiceStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "down":
      return "Down";
    case "unknown":
      return "Unknown";
  }
}

export function getStatusColor(status: ServiceStatus): string {
  switch (status) {
    case "healthy":
      return "text-green-600";
    case "degraded":
      return "text-yellow-600";
    case "down":
      return "text-red-600";
    case "unknown":
      return "text-gray-600";
  }
}
