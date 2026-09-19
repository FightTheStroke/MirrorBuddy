/**
 * Unit tests for FeatureFlagsPanel component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeatureFlagsPanel } from '../FeatureFlagsPanel';

// Mock csrfFetch
const mockCsrfFetch = vi.fn();
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
  };
});

// Mock fetch globally
const mockFetch = vi.fn();

describe('FeatureFlagsPanel', () => {
  const mockFlags = [
    {
      id: 'voice_realtime',
      name: 'Real-time Voice',
      description: 'WebSocket-based voice',
      status: 'enabled',
      enabledPercentage: 100,
      killSwitch: false,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rag_enabled',
      name: 'RAG Retrieval',
      description: 'Semantic search',
      status: 'enabled',
      enabledPercentage: 50,
      killSwitch: false,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'pdf_export',
      name: 'PDF Export',
      description: 'Accessible PDF generation',
      status: 'disabled',
      enabledPercentage: 100,
      killSwitch: true,
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          flags: mockFlags,
          globalKillSwitch: false,
          degradation: { level: 'none', affectedFeatures: [] },
        }),
    });
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          persistence: 'confirmed',
          superseded: false,
          scope: 'instance',
          effective: { killSwitch: true, status: 'enabled', enabledPercentage: 100 },
        }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders feature flags list after loading', async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Real-time Voice')).toBeInTheDocument();
    });
    expect(screen.getByText('RAG Retrieval')).toBeInTheDocument();
    expect(screen.getByText('PDF Export')).toBeInTheDocument();
  });

  it('shows feature count in header', async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Feature Flags (3)')).toBeInTheDocument();
    });
  });

  it('displays rollout percentage for partial rollouts', async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText('50% rollout')).toBeInTheDocument();
    });
  });

  it('shows healthy status when no degradation', async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Operativo')).toBeInTheDocument();
    });
    expect(screen.getByText('Tutti i sistemi sono operativi')).toBeInTheDocument();
  });

  it('displays Enable button for killed features', async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      const enableButtons = screen.getAllByRole('button', { name: 'Abilita' });
      expect(enableButtons.length).toBe(1);
    });
  });

  it('displays Disable button for active features', async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      const disableButtons = screen.getAllByRole('button', { name: 'Disabilita' });
      expect(disableButtons.length).toBe(2);
    });
  });

  it('calls API when toggling feature kill-switch', async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Real-time Voice')).toBeInTheDocument();
    });

    const disableButtons = screen.getAllByRole('button', { name: 'Disabilita' });
    fireEvent.click(disableButtons[0]);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        '/api/admin/feature-flags',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  it('shows global kill-switch button', async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Arresto globale' })).toBeInTheDocument();
    });
  });

  it('calls callback on flag update', async () => {
    const onFlagUpdate = vi.fn();
    render(<FeatureFlagsPanel onFlagUpdate={onFlagUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Real-time Voice')).toBeInTheDocument();
    });

    const disableButtons = screen.getAllByRole('button', { name: 'Disabilita' });
    fireEvent.click(disableButtons[0]);

    await waitFor(() => {
      expect(onFlagUpdate).toHaveBeenCalled();
    });
  });
});
