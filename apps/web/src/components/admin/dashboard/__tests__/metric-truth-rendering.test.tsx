import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { DashboardKpiGrid } from '../dashboard-kpi-grid';
import { MetricValue, MetricProvenance } from '../../metric-truth';
import { metricTruth, snapshotContext } from '@/lib/admin/metric-truth';
import AdminAnalyticsPage from '@/app/admin/analytics/page';
import { AnalyticsValue } from '@/app/admin/analytics/components/analytics-truth';
import { withMetricTruth } from '@/lib/admin/analytics-metric-truth';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/app/admin/analytics/components/reset-stats-button', () => ({
  ResetStatsButton: () => null,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('rendered metric truth contracts (copy keys, not locale acceptance)', () => {
  it('renders daily users as unavailable even for a legacy numeric payload', () => {
    render(
      <DashboardKpiGrid
        counts={{
          pendingInvites: 0,
          totalUsers: 8,
          activeUsers24h: 42,
          systemAlerts: 0,
          timestamp: '',
        }}
        summary={null}
      />,
    );
    const activity = screen.getByRole('link', { name: /activeUsers/ });
    expect(within(activity).getAllByText('states.unavailable').length).toBeGreaterThan(0);
    expect(within(activity).getByText('reasons.retentionWindow')).toBeInTheDocument();
    expect(within(activity).queryByText('42')).toBeNull();
  });

  it.each([
    ['optionalDisabled', 'disabled'],
    ['collectionFailed', 'failed'],
    [null, 'measured'],
  ] as const)('renders %s as %s, not an interchangeable zero', (reason, state) => {
    const metric = metricTruth(reason ? null : 0, {
      ...snapshotContext('TelemetryEvent', new Date().toISOString()),
      reason,
    });
    render(
      <>
        <MetricValue metric={metric} />
        <MetricProvenance metric={metric} />
      </>,
    );
    expect(screen.getAllByText(`states.${state}`).length).toBeGreaterThan(0);
    expect(screen.queryByText('0') !== null).toBe(reason === null);
  });

  it('renders original sample age as stale, with source/window and no invented coverage', () => {
    const metric = metricTruth(2, {
      source: 'TelemetryEvent',
      computedAt: '2020-01-08T00:00:00.000Z',
      window: { start: '2020-01-01T00:00:00.000Z', end: '2020-01-08T00:00:00.000Z' },
      population: 'recordedTelemetry',
    });
    const { container } = render(<MetricProvenance metric={metric} />);
    expect(screen.getByText('states.stale')).toBeInTheDocument();
    expect(screen.getByText('coverageUnknown')).toBeInTheDocument();
    expect(container.querySelector('time')).toHaveAttribute('datetime', metric.computedAt);
    expect(screen.getByText(/source.*TelemetryEvent/)).toBeInTheDocument();
    expect(screen.getByText(/window.*2020-01-01/)).toBeInTheDocument();
  });

  it('actual analytics page retains failed cards without fabricating KPI zeroes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Unavailable' }),
      }),
    );
    render(<AdminAnalyticsPage />);
    await screen.findAllByText('states.failed');
    expect(screen.getByRole('region', { name: 'accessibilityUsage' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'sessionCost' })).toHaveTextContent(
      'reasons.collectionFailed',
    );
    expect(screen.queryByText('€0.00')).toBeNull();
    expect(screen.queryByText('100%')).toBeNull();
  });

  it.each([401, 403])(
    'actual analytics page distinguishes HTTP %s from a collection failure',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status,
          json: async () => ({ error: 'Not authorized' }),
        }),
      );
      render(<AdminAnalyticsPage />);
      await screen.findAllByText('reasons.notPermitted');
      expect(screen.queryByText('reasons.collectionFailed')).toBeNull();
    },
  );

  it('keeps an explicit optional denial distinct from authorization failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ code: 'OPTIONAL_ANALYTICS_DENIED' }),
      }),
    );
    render(<AdminAnalyticsPage />);
    await screen.findAllByText('reasons.optionalDisabled');
    expect(screen.queryByText('reasons.notPermitted')).toBeNull();
  });

  it('keeps an unreadable HTTP 403 response classified as not permitted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => {
          throw new SyntaxError('Not JSON');
        },
      }),
    );
    render(<AdminAnalyticsPage />);
    await screen.findAllByText('reasons.notPermitted');
    expect(screen.queryByText('reasons.collectionFailed')).toBeNull();
  });

  it('renders an unknown daily cost as unavailable while retaining a genuine zero', () => {
    const context = snapshotContext('SessionMetrics', new Date().toISOString());
    const data = withMetricTruth({ dailyCost: { unknown: null, zero: 0 } }, context, {
      'dailyCost.unknown': { estimate: 'tokenPricing' },
      'dailyCost.zero': { estimate: 'tokenPricing' },
    });
    const { rerender } = render(<AnalyticsValue data={data} path="dailyCost.unknown" />);
    expect(screen.getAllByText('states.unavailable').length).toBeGreaterThan(0);
    expect(screen.getByText('reasons.missingData')).toBeInTheDocument();
    expect(screen.queryByText('0')).toBeNull();
    rerender(<AnalyticsValue data={data} path="dailyCost.zero" />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('estimates.tokenPricing')).toBeInTheDocument();
  });
});
