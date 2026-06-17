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

  it('suppresses all promo toasts in distraction-free mode (A11Y-05)', () => {
    const { rerender } = renderHook(
      (props: { status: TrialStatus; suppress: boolean }) =>
        useTrialToasts(props.status, { suppress: props.suppress }),
      { initialProps: { status: { ...baseStatus, chatsRemaining: 1 }, suppress: true } },
    );
    // No welcome toast on first visit while suppressed.
    expect(mockToast.info).not.toHaveBeenCalled();
    // No threshold toast even when crossing the exhausted boundary.
    rerender({ status: { ...baseStatus, chatsRemaining: 0 }, suppress: true });
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockToast.warning).not.toHaveBeenCalled();
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

  // COMP-01: the child (student) space must never receive commercial trial
  // toasts or CTAs that navigate to the PII-collecting invite-request form.
  describe('childSafe mode (COMP-01)', () => {
    const opts = { childSafe: true };

    it('does not show the promotional welcome toast', () => {
      renderHook(() => useTrialToasts(baseStatus, opts));
      expect(mockToast.info).not.toHaveBeenCalled();
    });

    it('does not show the 3-left / 1-left upsell toasts', () => {
      const { rerender } = renderHook((props: TrialStatus) => useTrialToasts(props, opts), {
        initialProps: { ...baseStatus, chatsRemaining: 4 },
      });
      rerender({ ...baseStatus, chatsRemaining: 3 });
      rerender({ ...baseStatus, chatsRemaining: 1 });
      expect(mockToast.warning).not.toHaveBeenCalled();
    });

    it('shows a child-friendly "ask a grown-up" message on exhaustion, with NO action', () => {
      const { rerender } = renderHook((props: TrialStatus) => useTrialToasts(props, opts), {
        initialProps: { ...baseStatus, chatsRemaining: 1 },
      });
      rerender({ ...baseStatus, chatsRemaining: 0 });

      // No adult/commercial error toast…
      expect(mockToast.error).not.toHaveBeenCalled();
      // …but an informative child toast with no navigation action.
      expect(mockToast.info).toHaveBeenCalledTimes(1);
      const [title, body, options] = mockToast.info.mock.calls[0];
      expect(title).toBe('trialToastChildDoneTitle');
      expect(body).toBe('trialToastChildDoneBody');
      expect(options).not.toHaveProperty('action');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('keeps telemetry tracking intact', () => {
      const { rerender } = renderHook((props: TrialStatus) => useTrialToasts(props, opts), {
        initialProps: { ...baseStatus, chatsRemaining: 1 },
      });
      rerender({ ...baseStatus, chatsRemaining: 0 });
      expect(mockTrackTrialLimitHit).toHaveBeenCalledWith('visitor-test-1', 'chat');
    });

    it('suppress (distraction-free) still silences even the child toast', () => {
      const { rerender } = renderHook(
        (props: TrialStatus) => useTrialToasts(props, { childSafe: true, suppress: true }),
        { initialProps: { ...baseStatus, chatsRemaining: 1 } },
      );
      rerender({ ...baseStatus, chatsRemaining: 0 });
      expect(mockToast.info).not.toHaveBeenCalled();
    });
  });
});
