"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface TrialUsageData {
  chat: { used: number; limit: number; percentage: number };
  voice: { used: number; limit: number; percentage: number; unit: string };
  tools: { used: number; limit: number; percentage: number };
  docs: { used: number; limit: number; percentage: number };
}

interface ResourceMetric {
  label: string;
  used: number;
  limit: number;
  percentage: number;
}

export function TrialUsageDashboard() {
  const [data, setData] = useState<TrialUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch("/api/user/usage");
        if (!response.ok) throw new Error("Failed to fetch trial usage");
        const usageData = await response.json();
        setData(usageData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">
          {error || "Unable to load trial usage data"}
        </p>
      </div>
    );
  }

  // Calculate resource metrics
  const resources: Record<string, ResourceMetric> = {
    chats: {
      label: "Chat Sessions",
      used: data.chat.used,
      limit: data.chat.limit,
      percentage: Math.round(data.chat.percentage),
    },
    docs: {
      label: "Documents",
      used: data.docs.used,
      limit: data.docs.limit,
      percentage: Math.round(data.docs.percentage),
    },
    voice: {
      label: "Voice Time (minutes)",
      used: Math.floor(data.voice.used / 60),
      limit: Math.floor(data.voice.limit / 60),
      percentage: Math.round(data.voice.percentage),
    },
    tools: {
      label: "Tools Used",
      used: data.tools.used,
      limit: data.tools.limit,
      percentage: Math.round(data.tools.percentage),
    },
  };

  // Check if any resource has >= 80% usage
  const hasHighUsage = Object.values(resources).some((r) => r.percentage >= 80);

  // Helper to determine progress bar color
  const getProgressColor = (percentage: number): string => {
    if (percentage > 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6" data-testid="trial-usage-dashboard">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Your Trial Usage
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          You are currently in the free trial. Upgrade your account to continue
          learning after reaching your limits.
        </p>
      </div>

      {/* Resource Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(resources).map(([key, resource]) => (
          <div
            key={key}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {resource.label}
              </h3>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                {resource.percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getProgressColor(resource.percentage)}`}
                style={{ width: `${Math.min(resource.percentage, 100)}%` }}
              />
            </div>

            {/* Usage Text */}
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {resource.used} of {resource.limit} used
            </p>
          </div>
        ))}
      </div>

      {/* Conditional CTA for High Usage */}
      {hasHighUsage && (
        <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-900 dark:text-orange-100 mb-4">
            You are approaching your trial limits. Upgrade now to continue
            learning without interruptions.
          </p>
          <Link
            href="/invite-request"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Richiedi invito per continuare →
          </Link>
        </div>
      )}

      {/* Info Section */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Trial Limits
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• {data.chat.limit} chat sessions per month</li>
          <li>• {data.docs.limit} document per month</li>
          <li>
            • {Math.floor(data.voice.limit / 60)} minutes of voice per month
          </li>
          <li>• {data.tools.limit} total tool uses per month</li>
        </ul>
      </div>
    </div>
  );
}
