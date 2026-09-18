/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { setClientIdentity } from '@/lib/auth';
import { MaintenanceWidget } from '../MaintenanceWidget';

const mockCsrfFetch = vi.fn();
const adminIdentity = {
  status: 'authenticated',
  userId: 'maintenance-admin',
  role: 'ADMIN',
  legacyOrigin: false,
  needsLegacyUpgrade: false,
} as const;

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
    setClientIdentity(adminIdentity);
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

  afterEach(() => act(() => setClientIdentity({ status: 'pending' })));

  it.each(['ADMIN_READONLY', 'USER'] as const)(
    'keeps status but hides cancellation for %s',
    async (role) => {
      setClientIdentity({ ...adminIdentity, role });
      render(<MaintenanceWidget />);
      await screen.findByText('Active maintenance');
      expect(screen.getByText('Upcoming maintenance')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(mockCsrfFetch).not.toHaveBeenCalled();
    },
  );

  it('does not offer cancellation while identity is unavailable', async () => {
    setClientIdentity({ status: 'unavailable', reason: 'network' });
    render(<MaintenanceWidget />);
    await screen.findByText('Active maintenance');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
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
