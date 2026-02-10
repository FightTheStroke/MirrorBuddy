/**
 * Sentry Errors Panel
 *
 * Displays recent unresolved errors from Sentry in the admin dashboard.
 * @see ADR 0070 - Sentry Error Tracking Integration
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  permalink: string;
  firstSeen: string;
  lastSeen: string;
  count: string;
  userCount: number;
  level: "error" | "warning" | "info" | "fatal";
  status: "resolved" | "unresolved" | "ignored";
  isUnhandled: boolean;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
  };
}

interface SentryErrorsPanelProps {
  refreshInterval?: number;
}

const levelConfig = {
  fatal: {
    icon: XCircle,
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    border: "border-red-200 dark:border-red-800",
  },
  error: {
    icon: AlertCircle,
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-200 dark:border-orange-800",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    border: "border-yellow-200 dark:border-yellow-800",
  },
  info: {
    icon: Info,
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-200 dark:border-blue-800",
  },
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "ora";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h fa`;
  return `${Math.floor(seconds / 86400)}g fa`;
}

export function SentryErrorsPanel({
  refreshInterval = 60000,
}: SentryErrorsPanelProps) {
  const t = useTranslations("admin.sentry");
  const [issues, setIssues] = useState<SentryIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchIssues = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);

    try {
      const response = await fetch("/api/admin/sentry/issues?limit=10");
      if (!response.ok) throw new Error("Failed to fetch Sentry issues");

      const data = await response.json();
      setIssues(data.issues || []);
      setError(data.error || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(() => fetchIssues(), refreshInterval);
    return () => clearInterval(interval);
  }, [fetchIssues, refreshInterval]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const sentryUrl = `https://sentry.io/organizations/${process.env.NEXT_PUBLIC_SENTRY_ORG || "fightthestroke"}/issues/`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            {t("sentryErrors")}
            {issues.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({issues.length} {t("unresolved")})
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchIssues(true)}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={sentryUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                {t("sentryTitle")}
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && !issues.length ? (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {error === "Sentry not configured" ? t("notConfigured") : error}
              </p>
            </div>
          ) : issues.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>{t("noUnresolvedErrors")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface IssueCardProps {
  issue: SentryIssue;
}

function IssueCard({ issue }: IssueCardProps) {
  const t = useTranslations("admin.sentry");
  const config = levelConfig[issue.level] || levelConfig.error;
  const Icon = config.icon;

  return (
    <a
      href={issue.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block p-3 rounded-lg border transition-colors hover:opacity-90",
        config.bg,
        config.border,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{issue.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {issue.culprit}
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {issue.shortId}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>{issue.count} {t("eventi")}</span>
            <span>{issue.userCount} {t("utenti")}</span>
            <span>{t("ultimo")} {formatTimeAgo(issue.lastSeen)}</span>
            {issue.isUnhandled && (
              <span className="px-1.5 py-0.5 bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 rounded text-[10px] font-medium">
                {t("unhandled")}
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </a>
  );
}

export default SentryErrorsPanel;
