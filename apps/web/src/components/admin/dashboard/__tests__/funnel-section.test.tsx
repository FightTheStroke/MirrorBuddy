import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { FunnelSection } from '../funnel-section';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/admin/user-drill-down-modal', () => ({ UserDrilldownModal: () => null }));
vi.mock('@/components/admin/funnel-chart', () => ({ FunnelChart: () => <div>chart</div> }));

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    Response.json(
      url.includes('/metrics')
        ? {
            stages: [],
            totals: { uniqueVisitors: 0, uniqueConverted: 0, overallConversionRate: 0 },
          }
        : { users: [], pagination: { totalPages: 0 } },
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('funnel period coherence', () => {
  it('requests the same 30-day window for the chart and participant table', async () => {
    render(<FunnelSection />);
    await screen.findByText('chart');
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    const urls = fetchMock.mock.calls.map(([url]) => new URL(url, 'http://localhost'));
    expect(urls.find((url) => url.pathname.endsWith('/metrics'))?.searchParams.get('days')).toBe(
      '30',
    );
    expect(urls.find((url) => url.pathname.endsWith('/users'))?.searchParams.get('days')).toBe(
      '30',
    );
    expect(screen.getByText('analyticsCoverage')).toBeInTheDocument();
  });
});
