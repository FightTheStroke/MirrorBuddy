/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BenchmarkHeatmap from './benchmark-heatmap';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Line: () => null,
}));

describe('BenchmarkHeatmap', () => {
  it('renders dynamic maestro x profile grid, overall column, and color-scale legend', () => {
    render(
      <BenchmarkHeatmap
        experiments={[
          {
            id: 'e-1',
            name: 'exp-1',
            maestroId: 'maestro-a',
            profileName: 'Profile One',
            scores: { scaffolding: 80, hinting: 60, adaptation: 70, misconceptionHandling: 90 },
          },
          {
            id: 'e-2',
            name: 'exp-2',
            maestroId: 'maestro-a',
            profileName: 'Profile Two',
            scores: { scaffolding: 50, hinting: 50, adaptation: 50, misconceptionHandling: 50 },
          },
          {
            id: 'e-3',
            name: 'exp-3',
            maestroId: 'maestro-b',
            profileName: 'Profile One',
            scores: { scaffolding: 20, hinting: 30, adaptation: 40, misconceptionHandling: 50 },
          },
        ]}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Profile One' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Profile Two' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /overall/i })).toBeInTheDocument();
    expect(screen.getByText('maestro-a')).toBeInTheDocument();
    expect(screen.getByText('maestro-b')).toBeInTheDocument();
    expect(screen.getByText(/colorScale/i)).toBeInTheDocument();
  });

  it('opens drill-down dialog when clicking a heatmap cell', () => {
    render(
      <BenchmarkHeatmap
        experiments={[
          {
            id: 'e-1',
            name: 'exp-1',
            hypothesis: 'Improve adaptation',
            maestroId: 'maestro-a',
            profileName: 'Profile One',
            status: 'completed',
            turnsCompleted: 5,
            createdAt: '2026-01-01T10:00:00.000Z',
            scores: { scaffolding: 80, hinting: 60, adaptation: 70, misconceptionHandling: 90 },
          },
        ]}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /open details for maestro-a profile one/i }),
    );

    expect(screen.getByRole('dialog', { name: /drillDown.title/i })).toBeInTheDocument();
    expect(screen.getByText('Improve adaptation')).toBeInTheDocument();
    expect(screen.getByLabelText('drillDown.progressionAriaLabel')).toBeInTheDocument();
  });
});
