import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FeatureFlagsPanel } from '../FeatureFlagsPanel';
import { getTranslation } from '@/test/i18n-helpers';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/auth', () => ({ csrfFetch: post }));
const flag = {
  id: 'quiz',
  name: 'Quiz',
  description: 'Quiz test',
  status: 'enabled',
  killSwitch: false,
  enabledPercentage: 100,
  updatedAt: new Date().toISOString(),
};

describe('instance-scoped policy feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ flags: [flag], globalKillSwitch: false }),
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it.each([503, 409])(
    'keeps returned protection and reports %s instead of fake success',
    async (status) => {
      const callback = vi.fn();
      post.mockResolvedValue({
        ok: false,
        status,
        json: async () => ({
          success: false,
          persistence: status === 503 ? 'unconfirmed' : 'skipped',
          superseded: status === 409,
          scope: 'instance',
          effective: { ...flag, killSwitch: true },
        }),
      });
      render(<FeatureFlagsPanel onFlagUpdate={callback} />);
      await screen.findByText('Quiz');
      fireEvent.click(
        screen.getByRole('button', { name: getTranslation('admin.policyWrite.disable') }),
      );
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
      expect(
        screen.getByRole('button', { name: getTranslation('admin.policyWrite.enable') }),
      ).toBeInTheDocument();
      expect(callback).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(
        screen.getByRole('button', { name: getTranslation('admin.policyWrite.enable') }),
      ).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    },
  );

  it('uses confirmed effective policy without a GET and calls back only on confirmation', async () => {
    const callback = vi.fn();
    post.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        persistence: 'confirmed',
        superseded: false,
        scope: 'instance',
        effective: { ...flag, killSwitch: true },
      }),
    });
    render(<FeatureFlagsPanel onFlagUpdate={callback} />);
    await screen.findByText('Quiz');
    fireEvent.click(
      screen.getByRole('button', { name: getTranslation('admin.policyWrite.disable') }),
    );
    await waitFor(() => expect(callback).toHaveBeenCalledWith('quiz', false));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
