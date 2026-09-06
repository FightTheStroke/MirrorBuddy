'use client';

import { Euro } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { SessionMetricsData } from '../types';
import { useTranslations } from 'next-intl';
import { AnalyticsValue } from './analytics-truth';

export function SessionCostCard({ data }: { data: SessionMetricsData | null }) {
  const t = useTranslations('admin');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Euro className="h-4 w-4 text-emerald-500" />
          {t('sessionCost')}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('metricTruth.estimates.tokenPricing')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-emerald-600">
              <AnalyticsValue
                data={data}
                path="cost.totalEur"
                format={(value) => `€${value.toFixed(2)}`}
              />
            </p>
            <p className="text-[10px] text-slate-500">{t('totalCost')}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">
              <AnalyticsValue
                data={data}
                path="cost.p95PerSession"
                format={(value) => `€${value.toFixed(3)}`}
              />
            </p>
            <p className="text-[10px] text-slate-500">{t('p95Session')}</p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              <AnalyticsValue data={data} path="tokens.total" />
            </p>
            <p className="text-[10px] text-slate-500">{t('totalTokens')}</p>
          </div>
        </div>
        {data?.outcomes && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500">{t('outcomes')}</p>
            {Object.entries(data.outcomes).map(([outcome, count]) => (
              <div key={outcome} className="flex items-center justify-between text-xs">
                <span
                  className={`capitalize ${
                    outcome === 'success'
                      ? 'text-green-600'
                      : outcome === 'dropped'
                        ? 'text-amber-600'
                        : outcome === 'stuck_loop'
                          ? 'text-red-600'
                          : 'text-slate-600'
                  }`}
                >
                  {outcome.replace('_', ' ')}
                </span>
                <span className="font-mono">{count}</span>
              </div>
            ))}
          </div>
        )}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          {}
          <p className="text-[10px] text-slate-400">
            €{data?.cost.pricing.textPer1kTokens ?? t('metricTruth.unknown')}/1K tokens · €
            {data?.cost.pricing.voicePerMin ?? t('metricTruth.unknown')}
            {t('minVoice')}
          </p>
          {}
        </div>
      </CardContent>
    </Card>
  );
}
