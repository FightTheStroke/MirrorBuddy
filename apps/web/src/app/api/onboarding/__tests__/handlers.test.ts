import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { POST } from '../handlers';
import { prisma } from '@/lib/db';
import { validateAuth, AuthenticationError } from '@/lib/auth/server';
import { assignBaseTierToNewUser } from '@/lib/tier/server';
import { requireCSRF } from '@/lib/security';
import { calculateAndPublishAdminCounts } from '@/lib/helpers/publish-admin-counts';
import {
  anonymousFixture,
  authenticatedFixture,
  mockSessionTransaction,
} from '@/test/fixtures/session-compat';
import { expectNativeSessionCookie } from '@/test/fixtures/session-credentials';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma(), isDatabaseNotInitialized: vi.fn(() => false) };
});
vi.mock('@/lib/tier/server', () => ({ assignBaseTierToNewUser: vi.fn() }));
vi.mock('@/lib/auth/server', async (original) => ({
  ...(await original<typeof import('@/lib/auth/server')>()),
  validateAuth: vi.fn(),
}));
vi.mock('@/lib/security', async (original) => ({
  ...(await original<typeof import('@/lib/security')>()),
  requireCSRF: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/helpers/publish-admin-counts', () => ({
  calculateAndPublishAdminCounts: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/compliance/server', () => ({
  COPPA_AGE_THRESHOLD: 13,
  requestParentalConsent: vi.fn(),
  checkCoppaStatus: vi.fn(),
}));

const user = { id: 'onboarding-owner', authVersion: 4, disabled: false };
const setCookie = vi.fn();
const request = () =>
  new NextRequest('http://localhost/api/onboarding', {
    method: 'POST',
    headers: { 'x-csrf-token': 'valid-token' },
    body: JSON.stringify({
      data: { name: 'Test User', age: 15, schoolLevel: 'superiore' },
      hasCompletedOnboarding: false,
      currentStep: 'welcome',
      isReplayMode: false,
    }),
  });
let sessionWrites: ReturnType<typeof mockSessionTransaction>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SESSION_SECRET', 'synthetic-onboarding-secret-at-least-32-characters');
  sessionWrites = mockSessionTransaction(prisma);
  vi.mocked(validateAuth).mockResolvedValue(anonymousFixture);
  vi.mocked(requireCSRF).mockReturnValue(true);
  vi.mocked(cookies).mockResolvedValue({ set: setCookie } as never);
  vi.mocked(prisma.user.create).mockResolvedValue(user as never);
  vi.mocked(prisma.onboardingState.upsert).mockResolvedValue({
    userId: user.id,
    hasCompletedOnboarding: false,
    currentStep: 'welcome',
  } as never);
  vi.mocked(assignBaseTierToNewUser).mockResolvedValue(null);
  vi.mocked(calculateAndPublishAdminCounts).mockResolvedValue({ success: true, duration: 0 });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/onboarding', () => {
  it('creates a guest and assigns Base tier', async () => {
    vi.mocked(assignBaseTierToNewUser).mockResolvedValue({ id: 'sub-base' } as never);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(prisma.user.create).toHaveBeenCalled();
    expect(assignBaseTierToNewUser).toHaveBeenCalledWith(user.id);
  });
  it('never duplicates an existing account or subscription', async () => {
    vi.mocked(validateAuth).mockResolvedValue(authenticatedFixture(user.id));
    expect((await POST(request())).status).toBe(200);
    expect(assignBaseTierToNewUser).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(sessionWrites.create).not.toHaveBeenCalled();
  });
  it('sets a native HttpOnly cookie and user-ID hint with the preserved 365-day lifetime', async () => {
    expect((await POST(request())).status).toBe(200);
    expect(setCookie).toHaveBeenCalledWith(
      'mirrorbuddy-user-id',
      expect.stringMatching(/^s2:/),
      expect.objectContaining({ httpOnly: true, maxAge: 31536000 }),
    );
    expect(setCookie).toHaveBeenCalledWith(
      'mirrorbuddy-user-id-client',
      user.id,
      expect.objectContaining({ httpOnly: false, maxAge: 31536000 }),
    );
    const credential = expectNativeSessionCookie(
      setCookie.mock.calls.find(([name]) => name === 'mirrorbuddy-user-id')?.[1],
    );
    expect(sessionWrites.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        handleHash: credential.handleHash,
        authVersion: 4,
        legacyOrigin: false,
        issuedAt: new Date('2026-09-06T00:00:00Z'),
        expiresAt: new Date('2027-09-06T00:00:00Z'),
      }),
    });
  });
  it('preserves creation if Base tier is missing', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(prisma.user.create).toHaveBeenCalled();
    expect(assignBaseTierToNewUser).toHaveBeenCalledWith(user.id);
  });
  it('retains CSRF before identity or issuance', async () => {
    vi.mocked(requireCSRF).mockReturnValue(false);
    expect((await POST(request())).status).toBe(403);
    expect(validateAuth).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it.each(['SESSION_REJECTED', 'SESSION_UNAVAILABLE', 'SESSION_NOT_ACTIVATED'] as const)(
    'never creates a guest on %s',
    async (code) => {
      vi.mocked(validateAuth).mockRejectedValue(new AuthenticationError(code));
      const response = await POST(request());
      expect(response.status).toBe(code === 'SESSION_REJECTED' ? 401 : 503);
      expect(await response.json()).toMatchObject({ code });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(setCookie).not.toHaveBeenCalled();
    },
  );
  it('does not emit a credential after session insertion failure', async () => {
    sessionWrites.create.mockRejectedValue(new Error('session insert failed'));
    expect((await POST(request())).status).toBe(500);
    expect(setCookie).not.toHaveBeenCalled();
    expect(prisma.onboardingState.upsert).not.toHaveBeenCalled();
  });
});
