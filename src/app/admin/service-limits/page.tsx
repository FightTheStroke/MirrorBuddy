"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import type { ServiceLimitsResponse } from "@/app/api/admin/service-limits/route";

export default function ServiceLimitsPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ServiceLimitsResponse | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/admin/service-limits");

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setSecondsAgo(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch service limits data",
      );
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => clearInterval(autoRefreshInterval);
  }, [fetchData]);

  // Update relative time display every second
  useEffect(() => {
    if (secondsAgo === null) return;

    const timerInterval = setInterval(() => {
      setSecondsAgo((prev) => (prev !== null ? prev + 1 : null));
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [secondsAgo]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-slate-600 dark:text-slate-400">
            Loading service limits...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Service Limits Monitor
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Real-time monitoring of external service quotas and usage limits
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data?.timestamp && secondsAgo !== null
              ? `Last updated: ${secondsAgo === 0 ? "just now" : `${secondsAgo} second${secondsAgo !== 1 ? "s" : ""} ago`}`
              : "No data"}
          </p>
          {refreshing && (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Auto-refresh: 30s
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Service Cards Grid - Will be implemented in T3-02 */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Placeholder cards - actual implementation in T3-02 */}
          <Card>
            <CardHeader>
              <CardTitle>Vercel</CardTitle>
              <CardDescription>
                Bandwidth, build minutes, function invocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Service cards will be implemented in T3-02
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supabase</CardTitle>
              <CardDescription>
                Database size, storage, connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Service cards will be implemented in T3-02
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resend</CardTitle>
              <CardDescription>Email quota monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Service cards will be implemented in T3-02
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Azure OpenAI</CardTitle>
              <CardDescription>Token and request rate limits</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Service cards will be implemented in T3-02
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Redis KV</CardTitle>
              <CardDescription>Storage and command limits</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Service cards will be implemented in T3-02
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!data && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              No service limits data available
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
