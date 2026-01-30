/**
 * Infrastructure Panel Page
 * Real-time monitoring of Vercel, Supabase, and Redis
 */

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InfraMetrics } from "@/lib/admin/infra-panel-types";
import { VercelCard } from "./components";
import { SupabaseCard, RedisCard } from "./service-cards";

export const dynamic = "force-dynamic";

export default function InfrastructurePage() {
  const [metrics, setMetrics] = useState<InfraMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/infra-panel");
      if (!response.ok) {
        throw new Error("Failed to fetch infrastructure metrics");
      }
      const result = await response.json();
      setMetrics(result.data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      void fetchMetrics();
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    void fetchMetrics();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Infrastructure</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of external services
          </p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={loading} variant="outline">
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {loading && !metrics && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {metrics && (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {/* Vercel */}
          <Card>
            <CardHeader>
              <CardTitle>Vercel</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.vercel ? (
                <VercelCard metrics={metrics.vercel} />
              ) : (
                <div className="text-sm text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supabase */}
          <Card>
            <CardHeader>
              <CardTitle>Supabase</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.supabase ? (
                <SupabaseCard metrics={metrics.supabase} />
              ) : (
                <div className="text-sm text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Redis */}
          <Card>
            <CardHeader>
              <CardTitle>Redis</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.redis ? (
                <RedisCard metrics={metrics.redis} />
              ) : (
                <div className="text-sm text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Info */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Service Health Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Vercel:</span>
                <span
                  className={
                    metrics.vercel?.status === "healthy"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }
                >
                  {metrics.vercel?.status || "unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Supabase:</span>
                <span
                  className={
                    metrics.supabase?.status === "healthy"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }
                >
                  {metrics.supabase?.status || "unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Redis:</span>
                <span
                  className={
                    metrics.redis?.status === "healthy"
                      ? "text-green-600"
                      : "text-yellow-600"
                  }
                >
                  {metrics.redis?.status || "unknown"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
