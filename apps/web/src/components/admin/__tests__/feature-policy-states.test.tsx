import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getTranslation } from '@/test/i18n-helpers';
import { FeatureFlagsPanel } from '../FeatureFlagsPanel';

describe('FeatureFlagsPanel read states', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows a loading skeleton', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    render(<FeatureFlagsPanel />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows degradation warning when system degraded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          flags: [],
          globalKillSwitch: false,
          degradation: { level: 'partial' },
        }),
      }),
    );
    render(<FeatureFlagsPanel />);
    expect(
      await screen.findByText(getTranslation('admin.policyWrite.partial')),
    ).toBeInTheDocument();
  });

  it('shows critical status and recovery control for a global stop', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ flags: [], globalKillSwitch: true }),
      }),
    );
    render(<FeatureFlagsPanel />);
    expect(
      await screen.findByText(getTranslation('admin.policyWrite.critical')),
    ).toBeInTheDocument();
    expect(screen.getByText(getTranslation('admin.policyWrite.globalStopped'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: getTranslation('admin.policyWrite.reactivateAll'),
      }),
    ).toBeInTheDocument();
  });

  it('announces a localized error when loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<FeatureFlagsPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      getTranslation('admin.policyWrite.loadFailed'),
    );
  });
});
