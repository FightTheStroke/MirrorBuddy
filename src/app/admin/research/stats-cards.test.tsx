/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ResearchStatsCards } from './stats-cards';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  BarChart: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="bar-chart" {...props}>
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Bar: () => null,
}));

describe('ResearchStatsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('fetches and renders ranked maestro cards with chart and aria labels', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          rank: 1,
          maestroId: 'maestro-a',
          overall: 85,
          experimentCount: 4,
          scaffolding: 90,
          hinting: 84,
          adaptation: 82,
          misconceptionHandling: 84,
        },
      ],
    });

    render(<ResearchStatsCards />);

    await waitFor(() => {
      expect(screen.getByText('maestro-a')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/research/stats');
    expect(screen.getByLabelText('stats.cardAriaLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('stats.dimensionsAriaLabel')).toBeInTheDocument();
  });
});
