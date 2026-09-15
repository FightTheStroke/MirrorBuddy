/** @vitest-environment jsdom */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DynamicOptions, Loader } from 'next/dynamic';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResearchStatsCards } from './stats-cards';
import BenchmarkHeatmap from './benchmark-heatmap';
import ABTestingDashboardPage from './ab-testing/page';
import { ChartLoading } from './chart-loading';
import { HeatmapDrillDown } from './heatmap-drill-down';
import { stats, buckets, results, experiments } from './chart-test-fixtures';

const chunk = vi.hoisted(() => {
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait: vi.fn(() => pending), release: () => release() };
});

vi.mock('next/dynamic', async () => {
  // Match Next's App Router alias; delay the real loaders, never statically import charts.
  const { default: appDynamic } = await import('next/dist/shared/lib/app-dynamic');
  return {
    default: <P extends object>(loader: Loader<P>, options: DynamicOptions<P>) =>
      appDynamic<P>(
        async () => {
          await chunk.wait();
          return typeof loader === 'function' ? loader() : loader;
        },
        { ssr: options.ssr, loading: () => <>{options.loading?.({})}</> },
      ),
  };
});

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({
    children,
    width,
    height,
  }: {
    children: ReactNode;
    width: string;
    height: string;
  }) => (
    <div data-testid="responsive-chart" data-width={width} data-height={height}>
      {children}
    </div>
  ),
  BarChart: ({ children, data }: { children: ReactNode; data: unknown }) => (
    <div>
      <output data-testid="bar-data">{JSON.stringify(data)}</output>
      {children}
    </div>
  ),
  LineChart: ({ children, data }: { children: ReactNode; data: unknown }) => (
    <div>
      <output data-testid="line-data">{JSON.stringify(data)}</output>
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  XAxis: ({ dataKey }: { dataKey: string }) => <span data-testid="x-key">{dataKey}</span>,
  YAxis: ({ domain }: { domain: number[] }) => (
    <span data-testid="y-domain">{JSON.stringify(domain)}</span>
  ),
  Tooltip: () => null,
  Bar: (props: object) => <span data-testid="bar-props">{JSON.stringify(props)}</span>,
  Line: (props: object) => <span data-testid="line-props">{JSON.stringify(props)}</span>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('deferred research charts with the real Next App Router loader', () => {
  it('keeps data, navigation, keyboard dialog and fixed chart slots usable while chunks wait', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.endsWith('/stats') ? stats : results),
    }));
    vi.stubGlobal('fetch', fetchMock);
    expect(chunk.wait).not.toHaveBeenCalled();
    render(
      <>
        <ResearchStatsCards />
        <ABTestingDashboardPage />
        <BenchmarkHeatmap experiments={experiments} />
      </>,
    );
    expect(screen.getByText('stats.loading')).toBeInTheDocument();
    expect(screen.getByText('abTesting.loading')).toBeInTheDocument();
    await screen.findByText('Tutor comparison');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/admin/research/stats',
      '/api/admin/research/ab-results',
    ]);
    expect(screen.getByLabelText('stats.cardAriaLabel')).toHaveTextContent('maestro-a');
    expect(screen.getByText('72.5')).toBeInTheDocument();
    expect(screen.getByText('85.0')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(chunk.wait).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('bar-data')).not.toBeInTheDocument();
    const statsSlot = screen.getByLabelText('stats.dimensionsAriaLabel');
    const abSlot = screen.getByLabelText('abTesting.chartAriaLabel');
    expect(statsSlot).toHaveClass('h-44');
    expect(abSlot).toHaveClass('h-56');
    expect(statsSlot.firstChild).toHaveClass('h-full', 'w-full', 'motion-reduce:animate-none');
    expect(statsSlot.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(abSlot.firstChild).toHaveClass('h-full', 'w-full');

    await user.tab();
    expect(screen.getByRole('link', { name: 'abTesting.manageTitle' })).toHaveFocus();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin/research/ab-testing/manage');
    await user.tab();
    expect(screen.getByRole('button', { name: /open details/i })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toHaveAccessibleName('drillDown.title');
    expect(screen.getByText('Improve adaptation')).toBeInTheDocument();
    expect(chunk.wait).toHaveBeenCalledTimes(3);
    const progressionSlot = screen.getByLabelText('drillDown.progressionAriaLabel');
    expect(progressionSlot).toHaveClass('h-64', 'rounded-md', 'border', 'p-3');
    expect(progressionSlot.firstChild).toHaveClass('h-full', 'w-full');
    expect(screen.queryByTestId('line-data')).not.toBeInTheDocument();

    await act(async () => {
      chunk.release();
    });
    await waitFor(() => expect(screen.getAllByTestId('bar-data')).toHaveLength(2));
    expect(
      screen.getAllByTestId('bar-data').map((node) => JSON.parse(node.textContent ?? 'null')),
    ).toEqual([
      [
        { name: 'stats.dimensions.scaffolding', value: 90 },
        { name: 'stats.dimensions.hinting', value: 84 },
        { name: 'stats.dimensions.adaptation', value: 82 },
        { name: 'stats.dimensions.misconceptionHandling', value: 84 },
      ],
      buckets,
    ]);
    expect(JSON.parse((await screen.findByTestId('line-data')).textContent ?? 'null')).toEqual([
      { turn: 5, score: 75 },
      { turn: 8, score: 90 },
    ]);
    expect(screen.getByLabelText('stats.dimensionsAriaLabel')).toBe(statsSlot);
    expect(screen.getByLabelText('abTesting.chartAriaLabel')).toBe(abSlot);
    expect(screen.getByLabelText('drillDown.progressionAriaLabel')).toBe(progressionSlot);
    expect(screen.getAllByTestId('x-key').map((node) => node.textContent)).toEqual([
      'name',
      'label',
      'turn',
    ]);
    for (const axis of screen.getAllByTestId('y-domain')) expect(axis).toHaveTextContent('[0,100]');
    for (const chart of screen.getAllByTestId('responsive-chart')) {
      expect(chart).toHaveAttribute('data-width', '100%');
      expect(chart).toHaveAttribute('data-height', '100%');
    }
    expect(
      screen.getAllByTestId('bar-props').map((node) => JSON.parse(node.textContent ?? 'null')),
    ).toEqual([
      { dataKey: 'value', fill: '#3b82f6', radius: [4, 4, 0, 0] },
      { dataKey: 'avgTutorBenchScore', fill: '#3b82f6', radius: [4, 4, 0, 0] },
    ]);
    expect(JSON.parse(screen.getByTestId('line-props').textContent ?? 'null')).toEqual({
      type: 'monotone',
      dataKey: 'score',
      stroke: '#2563eb',
      strokeWidth: 2,
      dot: { r: 4 },
    });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open details/i }));
    expect(await screen.findByTestId('line-data')).toBeInTheDocument();
    expect(chunk.wait).toHaveBeenCalledTimes(3);
  });

  it('preserves empty data rendering without requesting another chart', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    const calls = chunk.wait.mock.calls.length;
    render(
      <>
        <ResearchStatsCards />
        <ABTestingDashboardPage />
        <BenchmarkHeatmap experiments={[]} />
      </>,
    );
    await screen.findByText('abTesting.noExperiments');
    await waitFor(() => expect(screen.queryByText('stats.loading')).not.toBeInTheDocument());
    expect(
      screen.getByLabelText('stats.sectionAriaLabel').querySelectorAll('article'),
    ).toHaveLength(0);
    expect(
      screen.getByText('noCompletedExperimentsYetRunASimulationToSeeBenchm'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-chart')).not.toBeInTheDocument();
    expect(chunk.wait).toHaveBeenCalledTimes(calls);
  });

  it.each([
    [ResearchStatsCards, 'Failed to load research stats', 'maestro-a', stats],
    [ABTestingDashboardPage, 'Failed to load A/B results', 'Tutor comparison', results],
  ])(
    'preserves API failure reporting and successful data on remount (%s)',
    async (Page, error, name, data) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({ ok: false })
          .mockResolvedValueOnce({ ok: true, json: async () => data }),
      );
      const first = render(<Page />);
      expect(await screen.findByText(error)).toBeInTheDocument();
      expect(screen.queryByTestId('responsive-chart')).not.toBeInTheDocument();
      first.unmount();
      render(<Page />);
      expect(await screen.findByText(name)).toBeInTheDocument();
      expect(await screen.findByTestId('bar-data')).toBeInTheDocument();
      expect(screen.queryByText(error)).not.toBeInTheDocument();
    },
  );

  it('propagates chunk errors to the route error boundary instead of an endless skeleton', () => {
    const error = new Error('Chart chunk unavailable');
    expect(() => ChartLoading({ error })).toThrow(error);
  });

  it('preserves the no-progression dialog without loading a chart', () => {
    const calls = chunk.wait.mock.calls.length;
    render(
      <HeatmapDrillDown open onOpenChange={vi.fn()} maestroId="" profile="" experiments={[]} />,
    );
    expect(screen.getByText('drillDown.noProgression')).toBeInTheDocument();
    expect(screen.getByLabelText('drillDown.progressionAriaLabel')).toHaveClass('h-64');
    expect(screen.queryByTestId('line-data')).not.toBeInTheDocument();
    expect(chunk.wait).toHaveBeenCalledTimes(calls);
  });
});
