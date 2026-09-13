'use client';

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Euro,
  Activity,
  Mic,
  Brain,
  ShieldAlert,
} from 'lucide-react';
import { StatCard } from './components/stat-card';
import { SessionCostCard } from './components/session-cost-card';
import { TokenUsageCard } from './components/token-usage-card';
import { VoiceMetricsCard } from './components/voice-metrics-card';
import { FsrsStatsCard } from './components/fsrs-stats-card';
import { SafetyEventsCard } from './components/safety-events-card';
import { ExternalServicesCard } from './components/external-services-card';
import { A11yStatsWidget } from './components/a11y-stats-widget';
import { ResetStatsButton } from './components/reset-stats-button';
import type {
  TokenUsageData,
  VoiceMetricsData,
  FsrsStatsData,
  SafetyEventsData,
  SessionMetricsData,
  ExternalServicesData,
} from './types';
import type { A11yStatsData } from '@/app/api/dashboard/a11y-stats/route';
import { useTranslations } from 'next-intl';
import { AnalyticsSection, AnalyticsValue } from './components/analytics-truth';
import { metricTruth, snapshotContext, type MetricReason } from '@/lib/admin/metric-truth';

type DashboardData = {
  tokenUsage: TokenUsageData | null;
  voiceMetrics: VoiceMetricsData | null;
  fsrsStats: FsrsStatsData | null;
  safetyEvents: SafetyEventsData | null;
  sessionMetrics: SessionMetricsData | null;
  externalServices: ExternalServicesData | null;
  a11yStats: A11yStatsData | null;
};

const INITIAL_DATA: DashboardData = {
  tokenUsage: null,
  voiceMetrics: null,
  fsrsStats: null,
  safetyEvents: null,
  sessionMetrics: null,
  externalServices: null,
  a11yStats: null,
};

export default function AdminAnalyticsPage() {
  const t = useTranslations('admin');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [failures, setFailures] = useState<Partial<Record<keyof DashboardData, MetricReason>>>({});

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const urls = [
        '/api/dashboard/token-usage?days=7',
        '/api/dashboard/voice-metrics?days=7',
        '/api/dashboard/fsrs-stats?days=7',
        '/api/dashboard/safety-events?days=7',
        '/api/dashboard/session-metrics?days=7',
        '/api/dashboard/external-services',
        '/api/dashboard/a11y-stats?days=7',
      ];
      const keys = Object.keys(INITIAL_DATA) as (keyof DashboardData)[];
      const nextFailures: Partial<Record<keyof DashboardData, MetricReason>> = {};
      const parsed = await Promise.all(
        urls.map(async (url, index) => {
          let status: number | undefined;
          try {
            const response = await fetch(url);
            status = response.status;
            const body = await response.json();
            if (!response.ok || body?.error) {
              nextFailures[keys[index]] =
                status === 403 && body?.code === 'OPTIONAL_ANALYTICS_DENIED'
                  ? 'optionalDisabled'
                  : status === 401 || status === 403
                    ? 'notPermitted'
                    : 'collectionFailed';
              return null;
            }
            if (!body?.provenance || (!body?.summary && !body?.voice)) {
              nextFailures[keys[index]] = 'missingData';
              return null;
            }
            return body;
          } catch {
            nextFailures[keys[index]] =
              status === 401 || status === 403 ? 'notPermitted' : 'collectionFailed';
            return null;
          }
        }),
      );
      setFailures(nextFailures);
      setData({
        tokenUsage: parsed[0],
        voiceMetrics: parsed[1],
        fsrsStats: parsed[2],
        safetyEvents: parsed[3],
        sessionMetrics: parsed[4],
        externalServices: parsed[5],
        a11yStats: parsed[6],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const metric = (key: keyof DashboardData, path: string) =>
    data[key]?.metrics?.[path] ??
    metricTruth<number>(null, {
      ...snapshotContext(`/api/dashboard/${key}`, null),
      reason: failures[key] ?? 'missingData',
    });
  const sections = [
    {
      key: 'sessionMetrics',
      title: 'sessionCost',
      source: 'SessionMetrics',
      content: <SessionCostCard data={data.sessionMetrics} />,
    },
    {
      key: 'tokenUsage',
      title: 'tokenUsage',
      source: 'SessionMetrics',
      content: <TokenUsageCard data={data.tokenUsage} />,
    },
    {
      key: 'voiceMetrics',
      title: 'voiceMetrics',
      source: 'SessionMetrics',
      content: <VoiceMetricsCard data={data.voiceMetrics} />,
    },
    {
      key: 'fsrsStats',
      title: 'flashcardFsrsStats',
      source: 'TelemetryEvent + FlashcardProgress',
      content: <FsrsStatsCard data={data.fsrsStats} />,
    },
    {
      key: 'safetyEvents',
      title: 'safetyEvents',
      source: 'SafetyEvent',
      content: <SafetyEventsCard data={data.safetyEvents} />,
    },
    {
      key: 'externalServices',
      title: 'externalServices',
      source: 'TelemetryEvent (external_api)',
      content: <ExternalServicesCard data={data.externalServices} />,
    },
    {
      key: 'a11yStats',
      title: 'accessibilityUsage',
      source: 'TelemetryEvent (accessibility)',
      content: <A11yStatsWidget data={data.a11yStats} />,
    },
  ] as const;
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{t('last7Days')}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <ResetStatsButton />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title={t('sessionCost')}
          metric={metric('sessionMetrics', 'cost.totalEur')}
          format={(value) => `€${value.toFixed(2)}`}
          subValue={
            <>
              {t('metricTruth.averageSessionCost')}{' '}
              <AnalyticsValue
                data={data.sessionMetrics}
                path="cost.avgPerSession"
                format={(value) => `€${value.toFixed(3)}`}
              />
            </>
          }
          icon={Euro}
          color="green"
        />
        <StatCard
          title={t('totalSessions')}
          metric={metric('sessionMetrics', 'summary.totalSessions')}
          subValue={
            <>
              {t('metricTruth.averageTurns')}{' '}
              <AnalyticsValue data={data.sessionMetrics} path="summary.avgTurnsPerSession" />
            </>
          }
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title={t('voiceMinutes')}
          metric={metric('sessionMetrics', 'cost.voiceMinutes')}
          format={(value) => value.toFixed(1)}
          subValue={
            <>
              {t('metricTruth.voiceCost')}{' '}
              <AnalyticsValue
                data={data.sessionMetrics}
                path="cost.voiceCostEur"
                format={(value) => `€${value.toFixed(2)}`}
              />
            </>
          }
          icon={Mic}
          color="green"
        />
        <StatCard
          title={t('flashcardReviews')}
          metric={metric('fsrsStats', 'summary.totalReviews')}
          subValue={
            <>
              {t('accuracy')}{' '}
              <AnalyticsValue
                data={data.fsrsStats}
                path="summary.accuracy"
                format={(value) => `${value}%`}
              />
            </>
          }
          icon={Brain}
          color="blue"
        />
        <StatCard
          title={t('safetyRefusals')}
          metric={metric('sessionMetrics', 'safety.totalRefusals')}
          subValue={
            <>
              {t('accuracy')}{' '}
              <AnalyticsValue
                data={data.sessionMetrics}
                path="safety.refusalAccuracy"
                format={(value) => `${value}%`}
              />
            </>
          }
          icon={ShieldAlert}
          color="amber"
        />
      </div>

      {(data.safetyEvents?.summary.unresolvedCount ?? 0) > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <p className="font-medium text-sm text-red-900 dark:text-red-100">
                  {data.safetyEvents?.summary.unresolvedCount} {t('unresolvedSafetyEvents')}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {data.safetyEvents?.summary.criticalCount ?? 0} {t('critical')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map(({ key, title, source, content }) => (
          <AnalyticsSection
            key={key}
            data={data[key]}
            source={source}
            reason={failures[key]}
            title={t(title)}
          >
            {content}
          </AnalyticsSection>
        ))}
      </div>
    </div>
  );
}
