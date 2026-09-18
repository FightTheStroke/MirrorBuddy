/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getTranslation } from '@/test/i18n-helpers';
import { setClientIdentity } from '@/lib/auth';
import { MaintenanceTogglePanel } from '../MaintenanceTogglePanel';

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

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) =>
    getTranslation(`${namespace}.${key}`, values),
}));

describe('MaintenanceTogglePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setClientIdentity(adminIdentity);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: [],
        }),
    }) as typeof fetch;
  });

  afterEach(() => act(() => setClientIdentity({ status: 'pending' })));

  it.each(['ADMIN_READONLY', 'USER'] as const)('does not offer mutations to %s', async (role) => {
    setClientIdentity({ ...adminIdentity, role });
    render(<MaintenanceTogglePanel />);
    await screen.findByText(getTranslation('maintenance.admin.inactive'));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockCsrfFetch).not.toHaveBeenCalled();
  });

  it('keeps actions unavailable until identity is authenticated', async () => {
    setClientIdentity({ status: 'pending' });
    render(<MaintenanceTogglePanel />);
    await screen.findByText(getTranslation('maintenance.admin.inactive'));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    act(() => setClientIdentity({ status: 'unavailable', reason: 'network' }));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('removes an open confirmation when administrator authority is lost', async () => {
    render(<MaintenanceTogglePanel />);
    const toggle = await screen.findByRole('button', {
      name: getTranslation('maintenance.admin.activate'),
    });
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => setClientIdentity({ ...adminIdentity, role: 'ADMIN_READONLY' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(mockCsrfFetch).not.toHaveBeenCalled();
  });

  it('renders inactive status and opens confirmation dialog before toggle', async () => {
    render(<MaintenanceTogglePanel />);

    await screen.findByText(getTranslation('maintenance.admin.inactive'));

    expect(screen.getByText(getTranslation('maintenance.admin.inactive'))).toBeInTheDocument();
    const toggleButton = screen.getByRole('button', {
      name: getTranslation('maintenance.admin.activate'),
    });
    expect(toggleButton).toBeEnabled();
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
    await waitFor(() => expect(openDialogButton).toBeEnabled());
    expect(mockCsrfFetch).not.toHaveBeenCalled();
    fireEvent.click(openDialogButton);
    fireEvent.click(
      screen.getByRole('button', { name: getTranslation('maintenance.admin.confirmCancel') }),
    );

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
    await waitFor(() => expect(openDialogButton).toBeEnabled());
    fireEvent.click(openDialogButton);
    fireEvent.click(
      screen.getByRole('button', { name: getTranslation('maintenance.admin.confirmCancel') }),
    );

    await waitFor(() => {
      expect(screen.getByText('toggle failed')).toBeInTheDocument();
    });
  });
});
