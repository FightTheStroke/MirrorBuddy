/**
 * AI/Email Monitoring Components
 * Cards for Azure OpenAI, Sentry, and Resend
 */

import { Brain, Bug, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AzureOpenAIMetrics,
  SentryMetrics,
  ResendMetrics,
  ServiceStatus,
} from "@/lib/admin/ai-email-types";

interface StatusBadgeProps {
  status: ServiceStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    healthy: "bg-green-100 text-green-800 border-green-200",
    degraded: "bg-yellow-100 text-yellow-800 border-yellow-200",
    down: "bg-red-100 text-red-800 border-red-200",
  };

  const labels = {
    healthy: "Healthy",
    degraded: "Degraded",
    down: "Down",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

interface MetricBarProps {
  label: string;
  current: number;
  max: number;
  unit?: string;
}

function MetricBar({ label, current, max, unit = "" }: MetricBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  const barColor = isCritical
    ? "bg-red-500"
    : isWarning
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {current.toLocaleString()} / {max.toLocaleString()}
          {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface AzureOpenAICardProps {
  metrics: AzureOpenAIMetrics;
}

export function AzureOpenAICard({ metrics }: AzureOpenAICardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Azure OpenAI
          </CardTitle>
          <StatusBadge status={metrics.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricBar
          label="Token Usage"
          current={metrics.tokensUsed}
          max={metrics.tokensLimit}
        />

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-sm text-muted-foreground">Requests/Min</p>
            <p className="text-2xl font-bold">
              {metrics.requestsPerMinute}
              <span className="text-sm text-muted-foreground font-normal">
                {" "}
                / {metrics.rpmLimit}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Est. Cost</p>
            <p className="text-2xl font-bold">
              ${metrics.estimatedCostUsd.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">Model</p>
          <p className="text-sm font-medium">{metrics.model}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface SentryCardProps {
  metrics: SentryMetrics;
}

export function SentryCard({ metrics }: SentryCardProps) {
  const hasIssues = metrics.unresolvedIssues > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-purple-600" />
            Sentry
          </CardTitle>
          <StatusBadge status={metrics.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`p-4 rounded-lg ${hasIssues ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}
        >
          <p className="text-sm text-muted-foreground">Unresolved Issues</p>
          <p
            className={`text-3xl font-bold ${hasIssues ? "text-red-600" : "text-green-600"}`}
          >
            {metrics.unresolvedIssues}
          </p>
        </div>

        <MetricBar
          label="Events Today"
          current={metrics.eventsToday}
          max={metrics.eventsLimit}
        />

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-sm font-medium">
            {hasIssues
              ? `${metrics.unresolvedIssues} issue${metrics.unresolvedIssues > 1 ? "s" : ""} need attention`
              : "All clear"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ResendCardProps {
  metrics: ResendMetrics;
}

export function ResendCard({ metrics }: ResendCardProps) {
  const bouncePercentage = (metrics.bounceRate * 100).toFixed(2);
  const highBounceRate = metrics.bounceRate > 0.05; // >5% is concerning

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-green-600" />
            Resend
          </CardTitle>
          <StatusBadge status={metrics.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricBar
          label="Emails Sent Today"
          current={metrics.emailsSentToday}
          max={metrics.emailsLimit}
        />

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-sm text-muted-foreground">Bounce Rate</p>
            <p
              className={`text-2xl font-bold ${highBounceRate ? "text-red-600" : "text-green-600"}`}
            >
              {bouncePercentage}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Sent</p>
            <p className="text-sm font-medium">
              {metrics.lastSentAt
                ? new Date(metrics.lastSentAt).toLocaleTimeString()
                : "Never"}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-sm font-medium">
            {highBounceRate
              ? "High bounce rate detected"
              : "Email delivery healthy"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
