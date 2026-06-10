/**
 * MIRRORBUDDY - Use Trial Toasts Hook Tests
 *
 * Verifies trial toasts are localized (no hardcoded strings) and fire at the
 * correct remaining-message thresholds.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// next-intl returns the key itself so tests can assert on i18n keys
// (proves the hook no longer uses hardcoded Italian copy).
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockToast = vi.hoisted(() => ({
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/components/ui/toast', () => ({
  default: mockToast,
}));

const mockTrackTrialChat = vi.fn();
const mockTrackTrialLimitHit = vi.fn();
vi.mock('@/lib/telemetry/trial-events', () => ({
  trackTrialChat: (...args: unknown[]) => mockTrackTrialChat(...args),
  trackTrialLimitHit: (...args: unknown[]) => mockTrackTrialLimitHit(...args),
}));

import { useTrialToasts } from '../use-trial-toasts';

interface TrialStatus {
  isTrialMode: boolean;
  isLoading: boolean;
  chatsUsed: number;
  chatsRemaining: number;
  maxChats: number;
  visitorId?: string;
}

const baseStatus: TrialStatus = {
  isTrialMode: true,
  isLoading: false,
  chatsUsed: 0,
  chatsRemaining: 10,
  maxChats: 10,
  visitorId: 'visitor-test-1',
};

describe('useTrialToasts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows a localized welcome toast on first trial visit', () => {
    renderHook(() => useTrialToasts(baseStatus));

    expect(mockToast.info).toHaveBeenCalledTimes(1);
    const [title, body, options] = mockToast.info.mock.calls[0];
    expect(title).toBe('trialToastWelcomeTitle');
    expect(body).toBe('trialToastWelcomeBody');
    expect(options.action.label).toBe('trialToastWelcomeAction');
  });

  it('does not show the welcome toast for non-trial users', () => {
    renderHook(() => useTrialToasts({ ...baseStatus, isTrialMode: false }));
    expect(mockToast.info).not.toHaveBeenCalled();
  });

  it('does not show toasts while loading', () => {
    renderHook(() => useTrialToasts({ ...baseStatus, isLoading: true }));
    expect(mockToast.info).not.toHaveBeenCalled();
  });

  it('warns with localized copy when crossing the 3-messages threshold', () => {
    const { rerender } = renderHook((props: TrialStatus) => useTrialToasts(props), {
      initialProps: { ...baseStatus, chatsRemaining: 4 },
    });
    rerender({ ...baseStatus, chatsRemaining: 3 });

    expect(mockToast.warning).toHaveBeenCalledWith(
      'trialToastWarnTitle',
      'trialToastWarnBody',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'trialToastWelcomeAction' }),
      }),
    );
  });

  it('warns with localized copy when crossing the last-message threshold', () => {
    const { rerender } = renderHook((props: TrialStatus) => useTrialToasts(props), {
      initialProps: { ...baseStatus, chatsRemaining: 2 },
    });
    rerender({ ...baseStatus, chatsRemaining: 1 });

    expect(mockToast.warning).toHaveBeenCalledWith(
      'trialToastLastTitle',
      'trialToastLastBody',
      expect.anything(),
    );
  });

  it('shows a localized error and tracks limit hit when messages run out', () => {
    const { rerender } = renderHook((props: TrialStatus) => useTrialToasts(props), {
      initialProps: { ...baseStatus, chatsRemaining: 1 },
    });
    rerender({ ...baseStatus, chatsRemaining: 0 });

    expect(mockToast.error).toHaveBeenCalledWith(
      'trialToastDoneTitle',
      'trialToastDoneBody',
      expect.anything(),
    );
    expect(mockTrackTrialLimitHit).toHaveBeenCalledWith('visitor-test-1', 'chat');
  });
});
