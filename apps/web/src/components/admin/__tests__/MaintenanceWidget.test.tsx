/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MaintenanceWidget } from '../MaintenanceWidget';

const mockCsrfFetch = vi.fn();

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
  };
});

describe('MaintenanceWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [
            {
              id: 'active-1',
              message: 'Active maintenance',
              startTime: new Date(Date.now() - 2 * 60_000).toISOString(),
              endTime: new Date(Date.now() + 58 * 60_000).toISOString(),
              isActive: true,
              cancelled: false,
            },
            {
              id: 'upcoming-1',
              message: 'Upcoming maintenance',
              startTime: new Date(Date.now() + 60 * 60_000).toISOString(),
              endTime: new Date(Date.now() + 120 * 60_000).toISOString(),
              isActive: false,
              cancelled: false,
            },
          ],
        }),
    }) as typeof fetch;
  });

  it('renders active and upcoming windows', async () => {
    render(<MaintenanceWidget />);

    await waitFor(() => {
      expect(screen.getByText('Active maintenance')).toBeInTheDocument();
    });

    expect(screen.getByText('Upcoming maintenance')).toBeInTheDocument();
  });

  it('cancels a maintenance window', async () => {
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<MaintenanceWidget />);
    const cancelButtons = await screen.findAllByRole('button', {
      name: 'Annulla',
    });
    fireEvent.click(cancelButtons[0]);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        '/api/admin/maintenance/active-1',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });
  });
});
