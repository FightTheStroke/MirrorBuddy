/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getTranslation } from '@/test/i18n-helpers';
import { MaintenanceBanner } from '../maintenance-banner';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) =>
    getTranslation(`${namespace}.${key}`, values),
}));

describe('MaintenanceBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'none' }),
    }) as unknown as typeof fetch;
  });

  it('shows banner for upcoming maintenance and includes accessibility attributes', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'upcoming',
        message: 'Scheduled update',
        severity: 'medium',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      }),
    } as Response);

    render(<MaintenanceBanner />);

    const banner = await screen.findByRole('banner', {
      name: getTranslation('maintenance.banner.scheduled'),
    });
    expect(banner).toHaveClass('fixed', 'top-0', 'z-50', 'bg-amber-500');
    expect(screen.getByText(getTranslation('maintenance.banner.dismiss'))).toBeInTheDocument();
  });

  it('has visible focus styles on interactive elements', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'upcoming',
        message: 'Scheduled update',
        severity: 'medium',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      }),
    } as Response);

    render(<MaintenanceBanner />);

    const learnMoreLink = await screen.findByRole('link', {
      name: getTranslation('maintenance.banner.learnMore'),
    });
    const dismissButton = screen.getByRole('button', {
      name: getTranslation('maintenance.banner.dismiss'),
    });

    expect(learnMoreLink.className).toContain('focus-visible:ring-2');
    expect(dismissButton.className).toContain('focus-visible:ring-2');
  });

  it('uses high severity styling when maintenance severity is high', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'active',
        message: 'Emergency patch',
        severity: 'high',
      }),
    } as Response);

    render(<MaintenanceBanner />);

    const banner = await screen.findByRole('banner');
    expect(banner).toHaveClass('bg-red-600');
  });

  it('dismisses banner and persists dismissal in sessionStorage', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'active',
        message: 'Emergency patch',
        severity: 'medium',
      }),
    } as Response);

    render(<MaintenanceBanner />);

    const dismissButton = await screen.findByRole('button', {
      name: getTranslation('maintenance.banner.dismiss'),
    });
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    });
    expect(sessionStorage.getItem('maintenance-banner-dismissed')).toBe('true');
  });

  it('registers a five-minute polling interval', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');

    render(<MaintenanceBanner />);

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
  });
});
