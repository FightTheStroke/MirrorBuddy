'use client';

// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, ExternalLink, Loader2, FileDown } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { CostPanel } from '@/components/admin/CostPanel';
import { FeatureFlagsPanel } from '@/components/admin/FeatureFlagsPanel';
import { SLOMonitoringPanel } from '@/components/admin/SLOMonitoringPanel';
import { SentryErrorsPanel } from '@/components/admin/SentryErrorsPanel';
import { SentryQuotaCard } from '@/components/admin/SentryQuotaCard';
import { CollapsibleSection } from '@/components/admin/dashboard/collapsible-section';
import { FunnelSection } from '@/components/admin/dashboard/funnel-section';
import { DashboardKpiGrid } from '@/components/admin/dashboard/dashboard-kpi-grid';
import { PurgeStagingButton } from '@/components/admin/purge-staging-button';
import { cn } from '@/lib/utils';
import { useAdminCountsSSE } from '@/hooks/use-admin-counts-sse';

const GRAFANA_URL = 'https://mirrorbuddy.grafana.net/d/dashboard/';

export default function AdminDashboardPage() {
  const t = useTranslations('admin.dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sentryErrorCount, setSentryErrorCount] = useState(0);
  const { counts, status, error } = useAdminCountsSSE();

  useEffect(() => {
    async function fetchSentryCount() {
      try {
        const res = await fetch('/api/admin/sentry/issues?limit=25');
        if (res.ok) {
          const data = await res.json();
          setSentryErrorCount(data.issues?.length || 0);
        }
      } catch {
        // Sentry integration is optional
      }
    }
    fetchSentryCount();
    const interval = setInterval(fetchSentryCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      window.location.reload();
    }, 500);
  };

  if (status === 'idle' || status === 'connecting') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-6xl mx-auto space-y-6">
        {status === 'reconnecting' && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-300">{t('reconnecting')}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              {error || t('connectionFailed')}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap gap-2">
            <PurgeStagingButton />
            <Button variant="outline" size="sm" asChild>
              <a href="/api/admin/reports/summary" download>
                <FileDown className="h-4 w-4 mr-1.5" />
                Report PDF
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={GRAFANA_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Grafana
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn('h-4 w-4 mr-1.5', isRefreshing && 'animate-spin')} />
              {t('refresh')}
            </Button>
          </div>
        </div>

        <DashboardKpiGrid counts={counts} sentryErrorCount={sentryErrorCount} />

        <div className="space-y-3">
          <CollapsibleSection title={t('conversionFunnel')} defaultOpen>
            <FunnelSection />
          </CollapsibleSection>
          <CollapsibleSection title={t('costMonitoring')}>
            <CostPanel />
          </CollapsibleSection>
          <CollapsibleSection title={t('featureFlags')}>
            <FeatureFlagsPanel />
          </CollapsibleSection>
          <CollapsibleSection title={t('sloMonitoring')}>
            <SLOMonitoringPanel />
          </CollapsibleSection>
          <CollapsibleSection title={t('sentryErrorsPanel')} defaultOpen>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              <SentryQuotaCard />
            </div>
            <SentryErrorsPanel />
          </CollapsibleSection>
        </div>
      </div>
    </ErrorBoundary>
  );
}
