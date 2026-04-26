/**
 * Cost Panel - Admin Dashboard
 *
 * V1Plan FASE 2.1.5: Cost monitoring with GO/NO-GO thresholds
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface CostStats {
  avgCostText24h: number;
  avgCostVoice24h: number;
  spikesThisWeek: number;
  totalCost24h: number;
  sessionCount24h: number;
}

interface VoiceSession {
  sessionId: string;
  userId: string;
  durationMinutes: number;
  status: "ok" | "soft_cap" | "hard_cap";
}

interface VoiceLimits {
  softCapMinutes: number;
  hardCapMinutes: number;
  spikeCooldownMinutes: number;
}

interface CostPanelProps {
  refreshInterval?: number;
}

// V1Plan thresholds
const THRESHOLDS = {
  SESSION_TEXT_WARN: 0.05,
  SESSION_TEXT_LIMIT: 0.1,
  SESSION_VOICE_WARN: 0.15,
  SESSION_VOICE_LIMIT: 0.3,
  SPIKES_WARN: 3,
  SPIKES_LIMIT: 5,
};

export function CostPanel({ refreshInterval = 30000 }: CostPanelProps) {
  const t = useTranslations("admin");
  const [stats, setStats] = useState<CostStats | null>(null);
  const [activeSessions, setActiveSessions] = useState<VoiceSession[]>([]);
  const [limits, setLimits] = useState<VoiceLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/feature-flags?costs=true");
      if (!response.ok) throw new Error("Failed to fetch cost data");

      const data = await response.json();
      setStats(data.costStats || null);
      setActiveSessions(data.activeVoiceSessions || []);
      setLimits(data.voiceLimits || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cost Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{t("costMonitoring24h")}</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CostMetric
                label="Avg Text Session"
                value={stats.avgCostText24h}
                warnThreshold={THRESHOLDS.SESSION_TEXT_WARN}
                limitThreshold={THRESHOLDS.SESSION_TEXT_LIMIT}
              />
              <CostMetric
                label="Avg Voice Session"
                value={stats.avgCostVoice24h}
                warnThreshold={THRESHOLDS.SESSION_VOICE_WARN}
                limitThreshold={THRESHOLDS.SESSION_VOICE_LIMIT}
              />
              <div className="p-3 border rounded-lg">
                <p className="text-xs text-muted-foreground">{t("total24h")}</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(stats.totalCost24h)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.sessionCount24h} {t("sessions")}
                </p>
              </div>
              <SpikeMetric
                spikes={stats.spikesThisWeek}
                warnThreshold={THRESHOLDS.SPIKES_WARN}
                limitThreshold={THRESHOLDS.SPIKES_LIMIT}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("noCostDataAvailable")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Voice Limits */}
      {limits && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("voiceDurationLimits")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>{t("softCap")} {limits.softCapMinutes} {t("min3")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>{t("hardCap")} {limits.hardCapMinutes} {t("min2")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>{t("spikeCooldown")} {limits.spikeCooldownMinutes} {t("min1")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Voice Sessions */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("activeVoiceSessions")}{activeSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <VoiceSessionRow key={session.sessionId} session={session} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Sub-components

interface CostMetricProps {
  label: string;
  value: number;
  warnThreshold: number;
  limitThreshold: number;
}

function CostMetric({
  label,
  value,
  warnThreshold,
  limitThreshold,
}: CostMetricProps) {
  const t = useTranslations("admin");
  const status =
    value >= limitThreshold
      ? "exceeded"
      : value >= warnThreshold
        ? "warning"
        : "ok";

  const colors = {
    ok: "text-green-600",
    warning: "text-yellow-600",
    exceeded: "text-red-600",
  };

  return (
    <div className="p-3 border rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${colors[status]}`}>
        {formatCurrency(value)}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("limit")} {formatCurrency(limitThreshold)}
      </p>
    </div>
  );
}

interface SpikeMetricProps {
  spikes: number;
  warnThreshold: number;
  limitThreshold: number;
}

function SpikeMetric({
  spikes,
  warnThreshold,
  limitThreshold,
}: SpikeMetricProps) {
  const t = useTranslations("admin");
  const status =
    spikes >= limitThreshold
      ? "exceeded"
      : spikes >= warnThreshold
        ? "warning"
        : "ok";

  const colors = {
    ok: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    exceeded: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-3 border rounded-lg">
      <p className="text-xs text-muted-foreground">{t("spikes7d")}</p>
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-1 rounded text-lg font-semibold ${colors[status]}`}
        >
          {spikes}
        </span>
        <span className="text-xs text-muted-foreground">
          / {limitThreshold} {t("max")}
        </span>
      </div>
    </div>
  );
}

interface VoiceSessionRowProps {
  session: VoiceSession;
}

function VoiceSessionRow({ session }: VoiceSessionRowProps) {
  const t = useTranslations("admin");
  const statusColors = {
    ok: "bg-green-500",
    soft_cap: "bg-yellow-500",
    hard_cap: "bg-red-500",
  };

  const statusLabels = {
    ok: "Active",
    soft_cap: "Warning",
    hard_cap: "Limit",
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${statusColors[session.status]}`}
        />
        <span className="text-sm font-mono">
          {session.sessionId.slice(0, 8)}...
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span>{session.durationMinutes.toFixed(1)} {t("min")}</span>
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            session.status === "ok"
              ? "bg-green-100 text-green-700"
              : session.status === "soft_cap"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          {statusLabels[session.status]}
        </span>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return `€${value.toFixed(3)}`;
}

export default CostPanel;
