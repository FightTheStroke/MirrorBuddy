'use client';

import { Mic } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailyChart } from './daily-chart';
import type { VoiceMetricsData } from '../types';
import { useTranslations } from 'next-intl';
import { AnalyticsValue } from './analytics-truth';

function MetricBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

export function VoiceMetricsCard({ data }: { data: VoiceMetricsData | null }) {
  const t = useTranslations('admin');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mic className="h-4 w-4 text-green-500" />
          {t('voiceMetrics')}
        </CardTitle>
        <CardDescription className="text-xs">{t('voiceAndTtsUsageStatistics')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MetricBox
            label={t('metricTruth.voiceSessions')}
            value={<AnalyticsValue data={data} path="voice.totalSessions" />}
            sub={
              <AnalyticsValue
                data={data}
                path="voice.avgSessionMinutes"
                format={(value) => value.toFixed(1)}
              />
            }
          />
          <MetricBox
            label={t('metricTruth.ttsGenerations')}
            value={<AnalyticsValue data={data} path="tts.totalGenerations" />}
            sub={<AnalyticsValue data={data} path="tts.totalCharacters" />}
          />
          <MetricBox
            label={t('metricTruth.realtimeSessions')}
            value={<AnalyticsValue data={data} path="realtime.totalSessions" />}
            sub={<AnalyticsValue data={data} path="realtime.totalMinutes" />}
          />
          <MetricBox
            label={t('metricTruth.voiceMinutes')}
            value={
              <AnalyticsValue
                data={data}
                path="voice.totalMinutes"
                format={(value) => value.toFixed(1)}
              />
            }
          />
        </div>
        {data?.dailySessions && (
          <DailyChart data={data.dailySessions} label="Daily Sessions" color="green" />
        )}
      </CardContent>
    </Card>
  );
}
