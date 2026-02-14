/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MaintenanceTogglePanel } from '../MaintenanceTogglePanel';

const mockCsrfFetch = vi.fn();

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
  };
});

describe('MaintenanceTogglePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [],
        }),
    }) as typeof fetch;
  });

  it('renders inactive status and opens confirmation dialog before toggle', async () => {
    render(<MaintenanceTogglePanel />);

    await waitFor(() => {
      expect(screen.getByText('Stato attuale')).toBeInTheDocument();
    });

    expect(screen.getByText(getTranslation('maintenance.admin.inactive'))).toBeInTheDocument();
    const toggleButton = screen.getByRole('button', {
      name: getTranslation('maintenance.admin.activate'),
    });
    fireEvent.click(toggleButton);

    expect(screen.getByText("Confermi l'attivazione della manutenzione?")).toBeInTheDocument();
  });

  it('calls toggle API on confirmation', async () => {
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<MaintenanceTogglePanel />);
    const openDialogButton = await screen.findByRole('button', {
      name: getTranslation('maintenance.admin.activate'),
    });
    fireEvent.click(openDialogButton);
    fireEvent.click(screen.getByRole('button', { name: getTranslation('common.confirm') }));

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        '/api/admin/maintenance/toggle',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  it('shows an error when toggle request fails', async () => {
    mockCsrfFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'toggle failed' }),
    });

    render(<MaintenanceTogglePanel />);
    const openDialogButton = await screen.findByRole('button', {
      name: getTranslation('maintenance.admin.activate'),
    });
    fireEvent.click(openDialogButton);
    fireEvent.click(screen.getByRole('button', { name: getTranslation('common.confirm') }));

    await waitFor(() => {
      expect(screen.getByText('toggle failed')).toBeInTheDocument();
    });
  });
});
