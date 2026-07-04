/**
 * Regression tests for onboarding completion resolution in hydrateFromApi.
 *
 * Bug: a returning logged-in user with a real profile (a name) was bounced to
 * /welcome forever when their OnboardingState row had an explicit
 * hasCompletedOnboarding=false (the old `??` let that false win over the
 * "has existing data" signal). Replay mode must still force onboarding.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useOnboardingStore } from '../onboarding-store';

function mockOnboardingResponse(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => body,
    })) as unknown as typeof fetch,
  );
}

describe('onboarding-store hydrateFromApi — completion resolution', () => {
  beforeEach(() => {
    // Reset the hydration guard so each test re-runs hydrateFromApi.
    useOnboardingStore.setState({ isHydrated: false, hasCompletedOnboarding: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returning user with a profile name + stale hasCompletedOnboarding=false → completed (no /welcome bounce)', async () => {
    mockOnboardingResponse({
      onboardingState: { hasCompletedOnboarding: false, isReplayMode: false },
      hasExistingData: true,
      data: { name: 'MarioDan' },
    });

    await useOnboardingStore.getState().hydrateFromApi();

    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(true);
  });

  it('replay mode still forces onboarding even with a profile name', async () => {
    mockOnboardingResponse({
      onboardingState: { hasCompletedOnboarding: false, isReplayMode: true },
      hasExistingData: true,
      data: { name: 'MarioDan' },
    });

    await useOnboardingStore.getState().hydrateFromApi();

    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(false);
  });

  it('brand-new user with no profile name → not completed (onboarding shown)', async () => {
    mockOnboardingResponse({
      onboardingState: null,
      hasExistingData: false,
      data: null,
    });

    await useOnboardingStore.getState().hydrateFromApi();

    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(false);
  });

  it('credentialed user with no name yet → not completed (must still onboard)', async () => {
    // hasExistingData is true for any credentialed account, but without a real
    // profile name the user still needs to onboard — guarding on the name
    // (not on hasExistingData) prevents skipping onboarding for fresh accounts.
    mockOnboardingResponse({
      onboardingState: { hasCompletedOnboarding: false, isReplayMode: false },
      hasExistingData: true,
      data: { name: '' },
    });

    await useOnboardingStore.getState().hydrateFromApi();

    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(false);
  });

  it('explicit hasCompletedOnboarding=true is respected', async () => {
    mockOnboardingResponse({
      onboardingState: { hasCompletedOnboarding: true, isReplayMode: false },
      hasExistingData: true,
      data: { name: 'MarioDan' },
    });

    await useOnboardingStore.getState().hydrateFromApi();

    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(true);
  });
});
