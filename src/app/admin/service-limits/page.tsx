"use client";

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Server,
  Database,
  Mail,
  Brain,
  HardDrive,
} from "lucide-react";
import type {
  ServiceLimitsResponse,
  ServiceLimit,
} from "@/app/api/admin/service-limits/route";
import {
  ServiceLimitCard,
  type ServiceMetric,
} from "@/components/admin/service-limit-card";
import {
  getRecommendation,
  getServiceKey,
} from "@/lib/admin/service-recommendations";

export default function ServiceLimitsPage() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ServiceLimitsResponse | null>(null);

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

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchData]);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data?.timestamp
              ? `Last updated: ${new Date(data.timestamp).toLocaleString()}`
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

      {/* Service Cards Grid */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Vercel Card */}
          <ServiceLimitCard
            serviceName="Vercel"
            icon={<Server className="h-5 w-5 text-white" />}
            metrics={[
              convertToMetric("Bandwidth", data.vercel.bandwidth),
              convertToMetric("Build Minutes", data.vercel.buildMinutes),
              convertToMetric(
                "Function Invocations",
                data.vercel.functionInvocations,
              ),
            ]}
            recommendation={getRecommendation(
              getServiceKey("vercel"),
              getWorstStatus([
                data.vercel.bandwidth,
                data.vercel.buildMinutes,
                data.vercel.functionInvocations,
              ]),
            )}
          />

          {/* Supabase Card */}
          <ServiceLimitCard
            serviceName="Supabase"
            icon={<Database className="h-5 w-5 text-white" />}
            metrics={[
              convertToMetric("Database Size", data.supabase.databaseSize),
              convertToMetric("Storage", data.supabase.storage),
              convertToMetric("Connections", data.supabase.connections),
            ]}
            recommendation={getRecommendation(
              getServiceKey("supabase"),
              getWorstStatus([
                data.supabase.databaseSize,
                data.supabase.storage,
                data.supabase.connections,
              ]),
            )}
          />

          {/* Resend Card */}
          <ServiceLimitCard
            serviceName="Resend"
            icon={<Mail className="h-5 w-5 text-white" />}
            metrics={[
              convertToMetric("Emails Today", data.resend.emailsToday),
              convertToMetric("Emails This Month", data.resend.emailsThisMonth),
            ]}
            recommendation={getRecommendation(
              getServiceKey("resend"),
              getWorstStatus([
                data.resend.emailsToday,
                data.resend.emailsThisMonth,
              ]),
            )}
          />

          {/* Azure OpenAI Card */}
          <ServiceLimitCard
            serviceName="Azure OpenAI"
            icon={<Brain className="h-5 w-5 text-white" />}
            metrics={[
              convertToMetric("Chat TPM", data.azureOpenAI.chatTPM),
              convertToMetric("Chat RPM", data.azureOpenAI.chatRPM),
              convertToMetric("Embedding TPM", data.azureOpenAI.embeddingTPM),
              convertToMetric("TTS RPM", data.azureOpenAI.ttsRPM),
            ]}
            recommendation={getRecommendation(
              getServiceKey("azure"),
              getWorstStatus([
                data.azureOpenAI.chatTPM,
                data.azureOpenAI.chatRPM,
                data.azureOpenAI.embeddingTPM,
                data.azureOpenAI.ttsRPM,
              ]),
            )}
          />

          {/* Redis KV Card */}
          <ServiceLimitCard
            serviceName="Redis KV"
            icon={<HardDrive className="h-5 w-5 text-white" />}
            metrics={[
              convertToMetric("Storage", data.redis.storage),
              convertToMetric("Commands Per Day", data.redis.commandsPerDay),
            ]}
            recommendation={getRecommendation(
              getServiceKey("redis"),
              getWorstStatus([data.redis.storage, data.redis.commandsPerDay]),
            )}
          />
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

/**
 * Convert API ServiceLimit to ServiceMetric for display
 */
function convertToMetric(name: string, limit: ServiceLimit): ServiceMetric {
  return {
    name,
    usage: limit.usage,
    limit: limit.limit,
    percentage: limit.percentage,
    status:
      limit.status === "ok"
        ? "ok"
        : limit.status === "warning"
          ? "warning"
          : limit.status === "critical"
            ? "critical"
            : "emergency",
    unit: limit.unit || "",
    period: limit.period,
  };
}

/**
 * Get worst status from array of service limits
 */
function getWorstStatus(limits: ServiceLimit[]): ServiceMetric["status"] {
  const statusPriority = {
    ok: 0,
    warning: 1,
    critical: 2,
    emergency: 3,
  };

  let worstStatus: ServiceMetric["status"] = "ok";
  let worstPriority = 0;

  for (const limit of limits) {
    const priority =
      statusPriority[limit.status as keyof typeof statusPriority] || 0;
    if (priority > worstPriority) {
      worstPriority = priority;
      worstStatus = limit.status as ServiceMetric["status"];
    }
  }

  return worstStatus;
}
