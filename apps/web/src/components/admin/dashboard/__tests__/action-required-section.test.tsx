/**
 * ActionRequiredSection Component Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionRequiredSection } from '../action-required-section';
import { metricTruth, snapshotContext } from '@/lib/admin/metric-truth';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

function metrics(pendingInvites = 0, safetyUnresolved = 0, sentryErrors = 0, servicesDown = 0) {
  const context = snapshotContext('Test source', new Date().toISOString());
  return {
    pendingInvites: metricTruth(pendingInvites, context),
    safetyUnresolved: metricTruth(safetyUnresolved, context),
    sentryErrors: metricTruth(sentryErrors, context),
    servicesDown: metricTruth(servicesDown, context),
  };
}

describe('ActionRequiredSection', () => {
  it('returns null when all counts are zero', () => {
    const { container } = render(
      <ActionRequiredSection
        metrics={metrics()}
        pendingInvites={0}
        safetyUnresolved={0}
        sentryErrors={0}
        servicesDown={0}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when pendingInvites > 0', () => {
    render(
      <ActionRequiredSection
        metrics={metrics(3)}
        pendingInvites={3}
        safetyUnresolved={0}
        sentryErrors={0}
        servicesDown={0}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders multiple active items', () => {
    render(
      <ActionRequiredSection
        metrics={metrics(2, 5, 0, 1)}
        pendingInvites={2}
        safetyUnresolved={5}
        sentryErrors={0}
        servicesDown={1}
      />,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
  });

  it('uses red border when critical (servicesDown > 0)', () => {
    render(
      <ActionRequiredSection
        metrics={metrics(0, 0, 1, 1)}
        pendingInvites={0}
        safetyUnresolved={0}
        sentryErrors={1}
        servicesDown={1}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('border-red');
  });

  it('uses amber border when non-critical', () => {
    render(
      <ActionRequiredSection
        metrics={metrics(1)}
        pendingInvites={1}
        safetyUnresolved={0}
        sentryErrors={0}
        servicesDown={0}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('border-amber');
  });
});
