import { afterEach, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { MetricProvenance, MetricValue } from '../../metric-truth';
import { metricTruth, snapshotContext, type MetricTruth } from '@/lib/admin/metric-truth';
import ServiceHealthPage from '@/app/admin/mission-control/health/page';
import type { ServiceHealth } from '@/lib/admin/health-aggregator-types';
import itMessages from '../../../../../messages/it/admin.json';
import enMessages from '../../../../../messages/en/admin.json';
import frMessages from '../../../../../messages/fr/admin.json';
import deMessages from '../../../../../messages/de/admin.json';
import esMessages from '../../../../../messages/es/admin.json';

vi.unmock('next-intl');

const catalogs = { it: itMessages, en: enMessages, fr: frMessages, de: deMessages, es: esMessages };
const locales = ['it', 'en', 'fr', 'de', 'es'] as const;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderMetric(
  locale: (typeof locales)[number],
  metric: MetricTruth<number>,
  missing = false,
) {
  const copy = catalogs[locale].admin.metricTruth;
  const onError = vi.fn();
  const view = render(
    <NextIntlClientProvider
      locale={locale}
      messages={missing ? {} : { admin: { metricTruth: copy } }}
      timeZone="UTC"
      now={new Date('2026-01-01T00:00:00.000Z')}
      onError={onError}
    >
      <span data-testid="value">
        <MetricValue metric={metric} />
      </span>
      <MetricProvenance metric={metric} />
    </NextIntlClientProvider>,
  );
  return { ...view, copy, onError, scoped: within(view.container) };
}

it.each(locales)('renders distinct localized absence and zero states in %s', (locale) => {
  for (const reason of ['optionalDisabled', 'collectionFailed', 'notPermitted', null] as const) {
    const metric = metricTruth(reason ? null : 0, {
      ...snapshotContext('SessionMetrics', new Date().toISOString()),
      population: 'recordedTelemetry',
      reason,
    });
    const view = renderMetric(locale, metric);
    expect(view.scoped.getByTestId('value').textContent).toBe(
      reason ? view.copy.states[metric.status] : '0',
    );
    expect(view.container.querySelector('[data-metric-status]')).toHaveAttribute(
      'data-metric-status',
      metric.status,
    );
    expect(view.scoped.getByText(`${view.copy.source}: SessionMetrics`)).toBeVisible();
    expect(view.scoped.getByText(view.copy.populations.recordedTelemetry)).toBeVisible();
    expect(view.scoped.getByText(view.copy.coverageUnknown)).toBeVisible();
    if (reason) expect(view.scoped.getByText(view.copy.reasons[reason])).toBeVisible();
    expect(view.onError).not.toHaveBeenCalled();
    view.unmount();
  }
});

it.each(locales)('renders real ICU coverage and stale estimate provenance in %s', (locale) => {
  const computedAt = '2020-01-01T00:00:00.000Z';
  const metric = metricTruth(2, {
    ...snapshotContext('SessionMetrics', computedAt),
    population: 'eligibleOptIn',
    coverage: { observed: 2, total: 5 },
    estimate: 'tokenPricing',
  });
  const view = renderMetric(locale, metric);
  expect(view.scoped.getByText(view.copy.states.stale)).toBeVisible();
  expect(view.scoped.getByText(view.copy.estimates.tokenPricing)).toBeVisible();
  expect(
    view.scoped.getByText(
      view.copy.coverageKnown.replace('{observed}', '2').replace('{total}', '5'),
    ),
  ).toBeVisible();
  expect(view.container.querySelector('time')).toHaveAttribute('datetime', computedAt);
  expect(view.scoped.getByTestId('value')).toHaveTextContent('2');
  expect(view.onError).not.toHaveBeenCalled();
});

it('exposes missing messages instead of passing through a translation-key adapter', () => {
  const metric = metricTruth<number>(null, {
    ...snapshotContext('SessionMetrics', new Date().toISOString()),
    reason: 'collectionFailed',
  });
  const view = renderMetric('en', metric, true);
  expect(view.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'MISSING_MESSAGE' }));
  expect(view.scoped.getByTestId('value')).not.toHaveTextContent(view.copy.states.failed);
});

it('ages the displayed sample without a new server response or timestamp rewrite', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  const computedAt = new Date().toISOString();
  const view = renderMetric('it', metricTruth(3, snapshotContext('SessionMetrics', computedAt)));
  expect(view.scoped.getByText(view.copy.states.measured)).toBeVisible();
  act(() => vi.advanceTimersByTime(135_000));
  expect(view.scoped.getByText(view.copy.states.stale)).toBeVisible();
  expect(view.container.querySelector('time')).toHaveAttribute('datetime', computedAt);
  expect(view.onError).not.toHaveBeenCalled();
});

it.each(locales)(
  'renders known unhealthy versus unknown readiness on the real page in %s',
  async (locale) => {
    const lastChecked = new Date();
    const services: ServiceHealth[] = [
      {
        name: 'Observed outage',
        configured: true,
        status: 'down',
        readiness: 'notReady',
        lastChecked,
      },
      {
        name: 'Observed degradation',
        configured: true,
        status: 'degraded',
        readiness: 'notReady',
        lastChecked,
      },
      {
        name: 'Unknown result',
        configured: true,
        status: 'unknown',
        readiness: 'unknown',
        lastChecked,
      },
      {
        name: 'Rejected required check',
        configured: false,
        required: true,
        status: 'down',
        readiness: 'unknown',
        lastChecked,
      },
      {
        name: 'Healthy service',
        configured: true,
        status: 'healthy',
        readiness: 'ready',
        lastChecked,
      },
    ];
    const fetchHealth = vi.fn<typeof fetch>(async (input) => {
      expect(input).toBe('/api/admin/health-aggregator');
      return Response.json({
        services,
        overallStatus: 'down',
        checkedAt: lastChecked,
        configuredCount: 4,
        unconfiguredCount: 1,
      });
    });
    vi.stubGlobal('fetch', fetchHealth);
    const onError = vi.fn();
    const view = render(
      <NextIntlClientProvider
        locale={locale}
        messages={{ admin: catalogs[locale].admin }}
        timeZone="UTC"
        now={lastChecked}
        onError={onError}
      >
        <ServiceHealthPage />
      </NextIntlClientProvider>,
    );
    const scoped = within(view.container);
    const copy = catalogs[locale].admin.metricTruth.readiness;
    await waitFor(() => {
      expect(scoped.getAllByText(copy.notReady, { exact: true })).toHaveLength(2);
    });
    expect(scoped.getAllByText(copy.unknown, { exact: true })).toHaveLength(2);
    expect(scoped.getByText(copy.ready, { exact: true })).toBeVisible();
    expect(fetchHealth).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  },
);
