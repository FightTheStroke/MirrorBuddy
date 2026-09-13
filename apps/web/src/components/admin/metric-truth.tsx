'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { metricStatus, type MetricTruth } from '@/lib/admin/metric-truth';

export function MetricProvenance({
  metric,
  id,
}: {
  metric?: MetricTruth<unknown> | null;
  id?: string;
}) {
  const t = useTranslations('admin.metricTruth');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const status = metricStatus(metric, now);
  return (
    <span
      id={id}
      className="block mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-300 [&>span]:block"
      data-metric-status={status}
    >
      <span>{t(`states.${status}`)}</span>
      {metric?.unavailabilityReason && <span>{t(`reasons.${metric.unavailabilityReason}`)}</span>}
      {!metric && <span>{t('reasons.missingData')}</span>}
      <span>
        {t('source')}: {metric?.source || t('unknown')}
      </span>
      <span>
        {t('window')}: {metric?.window.start ?? t('snapshot')} &ndash;{' '}
        {metric?.window.end ?? t('unknown')}
      </span>
      <span>
        {t('computedAt')}:{' '}
        {metric?.computedAt ? (
          <time dateTime={metric.computedAt}>{metric.computedAt}</time>
        ) : (
          t('unknown')
        )}
      </span>
      {metric?.estimate && (
        <span>
          {t(
            metric.estimate === 'quotaAssumption'
              ? 'quotaEstimate'
              : `estimates.${metric.estimate}`,
          )}
        </span>
      )}
      {metric && <span>{t(`populations.${metric.population}`)}</span>}
      {metric?.population !== 'records' && metric && (
        <span>{metric.coverage ? t('coverageKnown', metric.coverage) : t('coverageUnknown')}</span>
      )}
    </span>
  );
}

export function MetricValue({
  metric,
  format,
}: {
  metric?: MetricTruth<number> | null;
  format?: (value: number) => string;
}) {
  const t = useTranslations('admin.metricTruth');
  return (
    <>
      {metric?.value != null && (metric.status === 'measured' || metric.status === 'estimated')
        ? format
          ? format(metric.value)
          : metric.value
        : t(`states.${metric?.status ?? 'unavailable'}`)}
    </>
  );
}
