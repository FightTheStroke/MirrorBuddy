/**
 * Infrastructure Panel Page
 * Real-time monitoring of Vercel, Supabase, Redis + Maintenance controls
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InfraMetrics } from '@/lib/admin/infra-panel-types';
import { VercelCard, NotConfiguredCard } from './components';
import { SupabaseCard, RedisCard } from './service-cards';
import { MaintenanceTogglePanel } from '@/components/admin/MaintenanceTogglePanel';
import { MaintenanceWidget } from '@/components/admin/MaintenanceWidget';
import { useTranslations } from 'next-intl';

export const dynamic = 'force-dynamic';

export default function InfrastructurePage() {
  const t = useTranslations('admin');
  const [metrics, setMetrics] = useState<InfraMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/infra-panel');
      if (!response.ok) {
        throw new Error('Failed to fetch infrastructure metrics');
      }
      const result = await response.json();
      setMetrics(result.data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();

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
          <h1 className="text-3xl font-bold tracking-tight">{t('infrastructure')}</h1>
          <p className="text-muted-foreground">{t('realTimeMonitoringOfExternalServices')}</p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground mt-1">
              {t('lastUpdated')} {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
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
          <Card>
            <CardHeader>
              <CardTitle>Vercel</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.vercel ? (
                <VercelCard metrics={metrics.vercel} />
              ) : (
                <NotConfiguredCard
                  serviceName="Vercel"
                  envVars={[{ name: 'VERCEL_TOKEN' }, { name: 'VERCEL_TEAM_ID', optional: true }]}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('supabase1')}</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.supabase ? (
                <SupabaseCard metrics={metrics.supabase} />
              ) : (
                <NotConfiguredCard serviceName="Supabase" envVars={[]} isError={true} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('redis1')}</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.redis ? (
                <RedisCard metrics={metrics.redis} />
              ) : (
                <NotConfiguredCard
                  serviceName="Redis"
                  envVars={[
                    { name: 'UPSTASH_REDIS_REST_URL' },
                    { name: 'UPSTASH_REDIS_REST_TOKEN' },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maintenance Controls */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <MaintenanceTogglePanel />
        <MaintenanceWidget />
      </div>

      {/* Service Health Summary */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>{t('serviceHealthSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>{t('vercel')}</span>
                <span
                  className={
                    metrics.vercel?.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'
                  }
                >
                  {metrics.vercel?.status || 'unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('supabase')}</span>
                <span
                  className={
                    metrics.supabase?.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'
                  }
                >
                  {metrics.supabase?.status || 'unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('redis')}</span>
                <span
                  className={
                    metrics.redis?.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'
                  }
                >
                  {metrics.redis?.status || 'unknown'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
