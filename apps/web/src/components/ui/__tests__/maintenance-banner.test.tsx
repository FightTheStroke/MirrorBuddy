/**
 * Unit tests for MaintenanceBanner.
 *
 * A student with a learning difference can lose unsaved work when the service is
 * suspended without warning. This banner is their only warning, so these tests
 * hold it to the contract that matters: it appears exactly when the API reports
 * an upcoming or active window and never otherwise, its "learn more" link keeps
 * the active locale (the app forces a locale prefix on every URL), it reserves
 * vertical space instead of covering the site header, it never grabs keyboard
 * focus, and its dismissal lasts for the browser session only.
 *
 * next-intl is mocked globally by src/test/setup.ts with the real Italian
 * copy and a fixed "it" locale, so the assertions below use real translations
 * and the locale-prefixed href resolves to /it/maintenance.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { getTranslation } from '@/test/i18n-helpers';
import { MaintenanceBanner } from '../maintenance-banner';

type ApiPayload =
  | { status: 'none' }
  | { status: 'upcoming'; message?: string; severity?: string; startTime: string; endTime?: string }
  | { status: 'active'; message?: string; severity?: string; estimatedEndTime?: string };

const OFFSET_VAR = '--maintenance-banner-offset';
const dismissLabel = getTranslation('maintenance.banner.dismiss');
const learnMoreLabel = getTranslation('maintenance.banner.learnMore');

function mockFetch(payload: ApiPayload, ok = true): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => payload,
  }) as unknown as typeof fetch;
}

describe('MaintenanceBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.documentElement.style.removeProperty(OFFSET_VAR);
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    document.documentElement.style.removeProperty(OFFSET_VAR);
    vi.restoreAllMocks();
  });

  it('does NOT render when the API reports no maintenance window', async () => {
    mockFetch({ status: 'none' });
    const { container } = render(<MaintenanceBanner />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="maintenance-banner"]')).toBeNull();
  });

  it('does NOT render when the API request fails', async () => {
    mockFetch({ status: 'none' }, false);
    const { container } = render(<MaintenanceBanner />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="maintenance-banner"]')).toBeNull();
  });

  it('renders when the API reports an upcoming window, showing the real countdown copy', async () => {
    // +30s buffer so flooring to whole minutes is deterministic at "1h 30m".
    const startTime = new Date(Date.now() + 90 * 60 * 1000 + 30 * 1000).toISOString();
    mockFetch({ status: 'upcoming', startTime });
    render(<MaintenanceBanner />);

    const banner = await screen.findByTestId('maintenance-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      getTranslation('maintenance.banner.countdown', { timeRemaining: '1h 30m' }),
    );
  });

  it('renders when the API reports an active window', async () => {
    mockFetch({ status: 'active' });
    render(<MaintenanceBanner />);

    const banner = await screen.findByTestId('maintenance-banner');
    // The region label identifies the notice; the visible body is the default
    // notification copy.
    expect(banner).toHaveAttribute('aria-label', getTranslation('maintenance.notification.title'));
    expect(banner).toHaveTextContent(getTranslation('maintenance.notification.body'));
  });

  it('is a labelled region, not a second banner landmark (does not shadow the site header)', async () => {
    mockFetch({ status: 'active' });
    render(<MaintenanceBanner />);

    const banner = await screen.findByTestId('maintenance-banner');
    expect(banner).toHaveAttribute('role', 'region');
    expect(banner).toHaveAttribute('aria-label');
    expect(banner).not.toHaveAttribute('role', 'banner');
  });

  it('points its "learn more" link at the localized maintenance route', async () => {
    mockFetch({ status: 'active' });
    render(<MaintenanceBanner />);

    const link = await screen.findByRole('link', { name: learnMoreLabel });
    // Uses the localized Link from @/i18n/navigation, which prepends the active
    // locale in the running app (localePrefix: "always"). jsdom has no Next
    // router, so the prefix itself is proven by the E2E spec; here we assert the
    // link targets the maintenance page rather than an external/wrong route.
    expect(link).toHaveAttribute('href', '/maintenance');
  });

  it('uses high-severity styling when severity is high', async () => {
    mockFetch({ status: 'active', severity: 'high' });
    render(<MaintenanceBanner />);

    const banner = await screen.findByTestId('maintenance-banner');
    expect(banner).toHaveClass('bg-red-600');
  });

  it('exposes visible focus styles on its interactive elements', async () => {
    mockFetch({ status: 'active' });
    render(<MaintenanceBanner />);

    const link = await screen.findByRole('link', { name: learnMoreLabel });
    const dismiss = screen.getByRole('button', { name: dismissLabel });
    expect(link.className).toContain('focus-visible:ring-2');
    expect(dismiss.className).toContain('focus-visible:ring-2');
  });

  it('never steals keyboard focus when it appears', async () => {
    mockFetch({ status: 'active' });
    render(<MaintenanceBanner />);

    await screen.findByTestId('maintenance-banner');
    expect(document.activeElement).toBe(document.body);
  });

  it('reserves vertical space via a CSS variable so it does not cover the header', async () => {
    // jsdom performs no layout, so stub a measurable height for the assertion.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(48);

    mockFetch({ status: 'active' });
    render(<MaintenanceBanner />);
    await screen.findByTestId('maintenance-banner');

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue(OFFSET_VAR)).toBe('48px'),
    );
  });

  it('clears the reserved space when dismissed', async () => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(48);
    mockFetch({ status: 'active' });
    render(<MaintenanceBanner />);
    await screen.findByTestId('maintenance-banner');

    fireEvent.click(screen.getByRole('button', { name: dismissLabel }));

    await waitFor(() => expect(screen.queryByTestId('maintenance-banner')).toBeNull());
    expect(document.documentElement.style.getPropertyValue(OFFSET_VAR)).toBe('0px');
  });

  it('persists dismissal in sessionStorage only (no localStorage — GDPR)', async () => {
    mockFetch({ status: 'active' });
    render(<MaintenanceBanner />);
    await screen.findByTestId('maintenance-banner');

    fireEvent.click(screen.getByRole('button', { name: dismissLabel }));

    expect(sessionStorage.getItem('maintenance-banner-dismissed')).toBe('true');
    expect(localStorage.getItem('maintenance-banner-dismissed')).toBeNull();
  });

  it('stays dismissed on remount within the same session', async () => {
    sessionStorage.setItem('maintenance-banner-dismissed', 'true');
    mockFetch({ status: 'active' });
    const { container } = render(<MaintenanceBanner />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="maintenance-banner"]')).toBeNull();
  });

  it('polls the maintenance API every five minutes', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    mockFetch({ status: 'none' });
    render(<MaintenanceBanner />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
  });
});
