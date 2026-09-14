'use client';

import type { ReactNode } from 'react';
import type { AnalyticsMetricPayload } from '@/lib/admin/analytics-metric-truth';
import { MetricValue, MetricProvenance } from '@/components/admin/metric-truth';
import { metricTruth, snapshotContext, type MetricReason } from '@/lib/admin/metric-truth';

export function AnalyticsValue({
  data,
  path,
  format,
}: {
  data: AnalyticsMetricPayload | null;
  path: string;
  format?: (value: number) => string;
}) {
  const metric =
    data?.metrics?.[path] ??
    metricTruth<number>(null, {
      source: data?.provenance?.source ?? '',
      window: data?.provenance?.window ?? { start: null, end: null },
      computedAt: data?.provenance?.computedAt ?? null,
      population: data?.provenance?.population,
      reason: 'missingData',
    });
  return (
    <span className="inline-block">
      <MetricValue metric={metric} format={format} />
      <MetricProvenance metric={metric} />
    </span>
  );
}

export function AnalyticsSection({
  data,
  source,
  reason,
  title,
  children,
}: {
  data: AnalyticsMetricPayload | null;
  source: string;
  reason?: MetricReason;
  title: string;
  children: ReactNode;
}) {
  const provenance =
    data?.provenance ??
    metricTruth<number>(null, {
      ...snapshotContext(source, null),
      reason: reason ?? 'missingData',
    });
  return (
    <section aria-label={title}>
      {data ? children : <h2 className="text-sm font-medium">{title}</h2>}
      <MetricProvenance metric={provenance} />
    </section>
  );
}
