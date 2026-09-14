import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { AdminLayoutClient } from '../admin-layout-client';
import { metricTruth, snapshotContext, type MetricTruth } from '@/lib/admin/metric-truth';
import type { AdminCounts } from '@/lib/admin/admin-counts-service';

type BadgeProps = { pendingInvites?: number; systemAlerts?: number };
vi.mock('../admin-sidebar', () => ({
  AdminSidebar: ({ pendingInvites, systemAlerts }: BadgeProps) => (
    <span
      data-testid="badge-input"
      data-pending={pendingInvites ?? 'unknown'}
      data-alerts={systemAlerts ?? 'unknown'}
    />
  ),
}));
vi.mock('../admin-header', () => ({
  AdminHeader: ({ pendingInvites, systemAlerts }: BadgeProps) => (
    <span
      data-testid="badge-input"
      data-pending={pendingInvites ?? 'unknown'}
      data-alerts={systemAlerts ?? 'unknown'}
    />
  ),
}));
vi.mock('../admin-breadcrumbs', () => ({ AdminBreadcrumbs: () => null }));
vi.mock('../command-palette', () => ({ CommandPalette: () => null }));

let streams: CountStream[] = [];
class CountStream {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor() {
    streams.push(this);
  }
  send(counts: AdminCounts) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(counts) }));
  }
}
const context = snapshotContext('Count source', new Date().toISOString());
const zero = metricTruth(0, context);

function counts(metric?: MetricTruth): AdminCounts {
  return {
    pendingInvites: 987,
    totalUsers: 10,
    activeUsers24h: null,
    systemAlerts: 987,
    timestamp: context.computedAt ?? '',
    ...(metric
      ? {
          metrics: {
            pendingInvites: metric,
            systemAlerts: metric,
            totalUsers: zero,
            activeUsers24h: metricTruth<number>(null, { ...context, reason: 'retentionWindow' }),
          },
        }
      : {}),
  };
}

beforeEach(() => {
  streams = [];
  vi.stubGlobal('EventSource', CountStream);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('real layout and SSE hook gate badge inputs on provenance', () => {
  it.each([
    { label: 'legacy missing metadata', metric: undefined, expected: 'unknown' },
    {
      label: 'malformed timestamp',
      metric: { ...metricTruth(987, context), computedAt: null },
      expected: 'unknown',
    },
    {
      label: 'failed collection',
      metric: metricTruth<number>(null, { ...context, reason: 'collectionFailed' }),
      expected: 'unknown',
    },
    { label: 'legitimate zero', metric: zero, expected: '0' },
    { label: 'legitimate positive count', metric: metricTruth(3, context), expected: '3' },
  ])('$label', ({ metric, expected }) => {
    render(
      <AdminLayoutClient>
        <p>Content</p>
      </AdminLayoutClient>,
    );
    expect(streams).toHaveLength(1);
    act(() => streams[0].send(counts(metric)));
    const consumers = screen.getAllByTestId('badge-input');
    expect(consumers).toHaveLength(3);
    for (const consumer of consumers) {
      expect(consumer).toHaveAttribute('data-pending', expected);
      expect(consumer).toHaveAttribute('data-alerts', expected);
    }
  });
});
