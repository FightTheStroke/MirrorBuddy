/**
 * AI/Email Monitoring Components
 * Cards for Azure OpenAI, Sentry, and Resend
 */

'use client';

import { useTranslations } from 'next-intl';
import { Brain, Bug, Mail, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  AzureOpenAIMetrics,
  SentryMetrics,
  ResendMetrics,
  ServiceStatus,
} from '@/lib/admin/ai-email-types';

interface StatusBadgeProps {
  status: ServiceStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations('admin.aiEmail');

  const styles = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    down: 'bg-red-100 text-red-800 border-red-200',
  };

  const labels = {
    healthy: t('statusHealthy'),
    degraded: t('statusDegraded'),
    down: t('statusDown'),
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

function MetricBar({ label, current, max, unit = '' }: MetricBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500';

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
  const t = useTranslations('admin.aiEmail');

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
        <MetricBar label={t('tokenUsage')} current={metrics.tokensUsed} max={metrics.tokensLimit} />

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('requestsPerMin')}</p>
            <p className="text-2xl font-bold">
              {metrics.requestsPerMinute}
              <span className="text-sm text-muted-foreground font-normal">
                {' '}
                / {metrics.rpmLimit}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('estimatedCost')}</p>
            <p className="text-2xl font-bold">${metrics.estimatedCostUsd.toFixed(2)}</p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">{t('model')}</p>
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
  const t = useTranslations('admin.aiEmail');
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
          className={`p-4 rounded-lg ${hasIssues ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}
        >
          <p className="text-sm text-muted-foreground">{t('unresolvedIssues')}</p>
          <p className={`text-3xl font-bold ${hasIssues ? 'text-red-600' : 'text-green-600'}`}>
            {metrics.unresolvedIssues}
          </p>
        </div>

        <MetricBar
          label={t('eventsToday')}
          current={metrics.eventsToday}
          max={metrics.eventsLimit}
        />

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">{t('status')}</p>
          <p className="text-sm font-medium">
            {hasIssues
              ? t('issuesNeedAttention', { count: metrics.unresolvedIssues })
              : t('allClear')}
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
  const t = useTranslations('admin.aiEmail');
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
          label={t('emailsSentToday')}
          current={metrics.emailsSentToday}
          max={metrics.emailsLimit}
        />

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('bounceRate')}</p>
            <p
              className={`text-2xl font-bold ${highBounceRate ? 'text-red-600' : 'text-green-600'}`}
            >
              {bouncePercentage}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('lastSent')}</p>
            <p className="text-sm font-medium">
              {metrics.lastSentAt ? new Date(metrics.lastSentAt).toLocaleTimeString() : t('never')}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">{t('status')}</p>
          <p className="text-sm font-medium">
            {highBounceRate ? t('highBounceRate') : t('emailDeliveryHealthy')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface NotConfiguredCardProps {
  icon: React.ReactNode;
  serviceName: string;
  requiredVars: string[];
}

export function NotConfiguredCard({ icon, serviceName, requiredVars }: NotConfiguredCardProps) {
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {serviceName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 p-3 bg-background rounded-lg border border-muted">
          <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Service Not Configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Configure the following environment variables to enable monitoring:
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Required Variables:</p>
          <ul className="space-y-1">
            {requiredVars.map((varName) => (
              <li
                key={varName}
                className="text-sm font-mono bg-background px-2 py-1 rounded border"
              >
                {varName}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
