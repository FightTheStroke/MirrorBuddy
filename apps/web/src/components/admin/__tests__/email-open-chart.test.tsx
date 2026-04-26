/**
 * Email Open Chart Tests - Timeline visualization component
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmailOpenChart } from '../email-open-chart';
import type { TimelineDataPoint } from '@/lib/email/stats-service';
import { getTranslation } from '@/test/i18n-helpers';

describe('EmailOpenChart', () => {
  const renderComponent = (timeline: TimelineDataPoint[]) => {
    return render(<EmailOpenChart timeline={timeline} />);
  };

  it('should display message when timeline is empty', () => {
    renderComponent([]);
    expect(
      screen.getByText(getTranslation('admin.communications.stats.noTimelineData')),
    ).toBeInTheDocument();
  });

  it('should render chart title with data', () => {
    const timeline: TimelineDataPoint[] = [
      { hour: '2024-01-15T10:00', count: 5 },
      { hour: '2024-01-15T11:00', count: 10 },
    ];
    renderComponent(timeline);
    expect(screen.getByText('Timeline Aperture')).toBeInTheDocument();
  });

  it('should render all timeline data points', () => {
    const timeline: TimelineDataPoint[] = [
      { hour: '2024-01-15T10:00', count: 5 },
      { hour: '2024-01-15T11:00', count: 10 },
      { hour: '2024-01-15T12:00', count: 3 },
    ];
    const { container } = renderComponent(timeline);
    const bars = container.querySelectorAll('[role="progressbar"]');
    expect(bars).toHaveLength(3);
  });

  it('should display hour labels for each data point', () => {
    const timeline: TimelineDataPoint[] = [
      { hour: '2024-01-15T10:00', count: 5 },
      { hour: '2024-01-15T11:00', count: 10 },
    ];
    renderComponent(timeline);
    expect(screen.getByText('2024-01-15T10:00')).toBeInTheDocument();
    expect(screen.getByText('2024-01-15T11:00')).toBeInTheDocument();
  });

  it('should scale bars based on max count', () => {
    const timeline: TimelineDataPoint[] = [
      { hour: '10:00', count: 5 },
      { hour: '11:00', count: 10 },
      { hour: '12:00', count: 2 },
    ];
    const { container } = renderComponent(timeline);
    const bars = container.querySelectorAll('[role="progressbar"]');

    // Max is 10, so percentages should be: 50%, 100%, 20%
    expect(bars[0]).toHaveStyle({ width: '50%' });
    expect(bars[1]).toHaveStyle({ width: '100%' });
    expect(bars[2]).toHaveStyle({ width: '20%' });
  });

  it('should display count inside bar when percentage > 10', () => {
    const timeline: TimelineDataPoint[] = [{ hour: '10:00', count: 50 }];
    const { container } = renderComponent(timeline);
    const barContent = container.querySelector('[role="progressbar"]');
    expect(barContent?.textContent).toBe('50');
  });

  it('should display count outside bar when percentage <= 10', () => {
    const timeline: TimelineDataPoint[] = [
      { hour: '10:00', count: 1 },
      { hour: '11:00', count: 100 },
    ];
    renderComponent(timeline);
    // Count 1 is 1% of max 100, should be outside
    expect(screen.getAllByText('1')).toHaveLength(1);
  });

  it('should set correct aria attributes for accessibility', () => {
    const timeline: TimelineDataPoint[] = [{ hour: '10:00', count: 5 }];
    const { container } = renderComponent(timeline);
    const bar = container.querySelector('[role="progressbar"]');

    expect(bar).toHaveAttribute('aria-valuenow', '5');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
    expect(bar).toHaveAttribute('aria-label', '10:00: 5 opens');
  });

  it('should handle single data point correctly', () => {
    const timeline: TimelineDataPoint[] = [{ hour: '10:00', count: 42 }];
    const { container } = renderComponent(timeline);
    const bar = container.querySelector('[role="progressbar"]');

    // Single point means it's 100% of max
    expect(bar).toHaveStyle({ width: '100%' });
    expect(bar).toHaveAttribute('aria-valuemax', '42');
  });

  it('should handle zero counts gracefully', () => {
    const timeline: TimelineDataPoint[] = [
      { hour: '10:00', count: 0 },
      { hour: '11:00', count: 5 },
    ];
    const { container } = renderComponent(timeline);
    const bars = container.querySelectorAll('[role="progressbar"]');

    // Zero count should have minimum width (2%)
    expect(bars[0]).toHaveStyle({ width: '2%' });
  });
});
