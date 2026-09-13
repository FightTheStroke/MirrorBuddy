import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import messages from '../../../../../messages/en/admin.json';
import { StatusBar } from '../status-bar';
import { ActionRequiredSection } from '../action-required-section';
import { metricTruth, snapshotContext, type MetricTruth } from '@/lib/admin/metric-truth';

vi.unmock('next-intl');

const now = new Date('2026-09-06T00:00:00Z');
const context = snapshotContext('Recorded fixture source', now.toISOString());
const zero = metricTruth(0, context);
const rawCounts = { pendingInvites: 0, safetyUnresolved: 0, sentryErrors: 0, servicesDown: 0 };
const zeroCounts = {
  pendingInvites: zero,
  safetyUnresolved: zero,
  sentryErrors: zero,
  servicesDown: zero,
};
const labels = messages.admin;
const costName = (name: string) => name.startsWith(`${labels.dashboard.statusBar.costs}:`);
const inviteName = (name: string) =>
  name.startsWith(`${labels.dashboard.actionRequired.pendingInvites}:`);

function provider(children: ReactNode) {
  return (
    <NextIntlClientProvider locale="en" timeZone="UTC" now={now} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

function controls(metric: MetricTruth) {
  const metrics = {
    health: metricTruth<'healthy'>('healthy', context),
    servicesDown: zero,
    safety: zero,
    cost: metric,
    dailyCost: metric,
    mrr: zero,
    trialConversionRate: zero,
    churnRate: zero,
  };
  return (
    <>
      <StatusBar
        healthStatus="healthy"
        safetyUnresolved={0}
        dailyCostEur={metric.value}
        metrics={metrics}
      />
      <ActionRequiredSection
        {...rawCounts}
        pendingInvites={2}
        metrics={{ ...zeroCounts, pendingInvites: metric }}
      />
      <div id="cost-section" />
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('focused metric caveats with actual next-intl messages', () => {
  it('describes a permission restriction without announcing a collection outage', () => {
    render(provider(controls(metricTruth<number>(null, { ...context, reason: 'notPermitted' }))));
    const button = screen.getByRole('button', {
      name: costName,
    });
    const link = screen.getByRole('link', {
      name: inviteName,
    });
    for (const control of [button, link]) {
      expect(control).toHaveAccessibleDescription(
        expect.stringContaining(labels.metricTruth.reasons.notPermitted),
      );
      expect(control).not.toHaveAccessibleDescription(
        expect.stringContaining(labels.metricTruth.states.failed),
      );
    }
  });

  it.each(['failed', 'unavailable', 'estimated', 'stale'] as const)(
    'exposes %s provenance as the focused button and link description',
    (state) => {
      const metric =
        state === 'failed'
          ? metricTruth<number>(null, { ...context, reason: 'collectionFailed' })
          : state === 'unavailable'
            ? metricTruth<number>(null, { ...context, reason: 'missingData' })
            : state === 'estimated'
              ? metricTruth(2, { ...context, estimate: 'tokenPricing' })
              : metricTruth(2, { ...context, computedAt: '2020-01-01T00:00:00Z' });
      render(provider(controls(metric)));
      const button = screen.getByRole('button', {
        name: costName,
      });
      const link = screen.getByRole('link', {
        name: inviteName,
      });
      for (const control of [button, link]) {
        control.focus();
        expect(control).toHaveFocus();
        expect(control).toHaveAccessibleDescription(
          expect.stringContaining(labels.metricTruth.states[state]),
        );
        expect(control).toHaveAccessibleDescription(/Recorded fixture source/);
        const descriptionId = control.getAttribute('aria-describedby');
        expect(descriptionId).toBeTruthy();
        expect(document.getElementById(descriptionId!)).toHaveAttribute(
          'data-metric-status',
          state,
        );
      }
      expect(link).toHaveAttribute('href', '/admin/invites');
      const scroll = vi.fn();
      Object.defineProperty(document.getElementById('cost-section'), 'scrollIntoView', {
        value: scroll,
      });
      fireEvent.click(button);
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth' });
    },
  );

  it('keeps unique stable descriptions linked when only the child freshness clock changes', () => {
    const metric = metricTruth(2, context);
    render(
      provider(
        <>
          {controls(metric)}
          {controls(metric)}
        </>,
      ),
    );
    const focused = [
      ...screen.getAllByRole('button', { name: costName }),
      ...screen.getAllByRole('link', {
        name: inviteName,
      }),
    ];
    const ids = focused.map((control) => control.getAttribute('aria-describedby'));
    expect(new Set(ids).size).toBe(focused.length);
    for (const control of focused) {
      expect(control).toHaveAccessibleDescription(
        expect.stringContaining(labels.metricTruth.states.measured),
      );
    }
    act(() => vi.advanceTimersByTime(135_000));
    expect(focused.map((control) => control.getAttribute('aria-describedby'))).toEqual(ids);
    for (const control of focused) {
      control.focus();
      expect(control).toHaveAccessibleDescription(
        expect.stringContaining(labels.metricTruth.states.stale),
      );
      expect(control).toHaveAccessibleDescription(/2026-09-06T00:00:00.000Z/);
    }
  });
});

describe('action counts require available truth metadata', () => {
  it.each([0, 987])(
    'does not present legacy count %s without metadata as a measurement',
    (count) => {
      render(provider(<ActionRequiredSection {...rawCounts} pendingInvites={count} />));
      const link = screen.getByRole('link', {
        name: inviteName,
      });
      expect(link).toHaveAccessibleDescription(
        expect.stringContaining(labels.metricTruth.reasons.missingData),
      );
      expect(link).not.toHaveAccessibleName(
        `${labels.dashboard.actionRequired.pendingInvites}: ${count}`,
      );
      expect(screen.queryByText(String(count), { exact: true })).toBeNull();
    },
  );

  it.each([
    { ...metricTruth(987, context), computedAt: null },
    { ...metricTruth(987, context), source: '' },
    { ...metricTruth(987, context), window: { start: null, end: null } },
    { ...metricTruth(987, context), value: Number.NaN },
  ])('does not render a value from malformed metadata', (metric) => {
    render(
      provider(
        <ActionRequiredSection
          {...rawCounts}
          pendingInvites={987}
          metrics={{ ...zeroCounts, pendingInvites: metric }}
        />,
      ),
    );
    expect(screen.queryByText('987', { exact: true })).toBeNull();
    const link = screen.getByRole('link', {
      name: inviteName,
    });
    expect(link).toHaveAccessibleDescription(
      expect.stringContaining(labels.metricTruth.reasons.missingData),
    );
  });

  it('treats a current measured zero as zero, not unknown or a raw legacy alert', () => {
    const { container } = render(
      provider(<ActionRequiredSection {...rawCounts} pendingInvites={987} metrics={zeroCounts} />),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it.each(['window', 'computedAt', 'source', 'unavailabilityReason', 'freshnessThresholdMs'])(
    'rejects metadata with its required %s field missing',
    (field) => {
      const metric = metricTruth(987, context);
      Reflect.deleteProperty(metric, field);
      render(
        provider(
          <ActionRequiredSection
            {...rawCounts}
            pendingInvites={987}
            metrics={{ ...zeroCounts, pendingInvites: metric }}
          />,
        ),
      );
      expect(screen.queryByText('987', { exact: true })).toBeNull();
    },
  );
});
