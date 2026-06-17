/**
 * MIRRORBUDDY - GenitoriView API Handlers Tests
 *
 * BUG-03: the parent dashboard previously sent the hardcoded "demo-student-1"
 * id to every /api/profile* call. The consent/generate routes reject any id
 * that does not match the authenticated session (403), so this broke the
 * dashboard for all real users and would have leaked demo data otherwise.
 * These tests assert the handlers send the real authenticated user id.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCsrfFetch = vi.fn();
vi.mock('@/lib/auth', () => ({
  csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
}));

import {
  fetchConsentStatus,
  fetchProfile,
  generateProfile,
  giveConsent,
  requestDeletion,
} from '../api-handlers';

const REAL_USER_ID = 'user-7f3a9c';
const DEMO_ID = 'demo-student-1';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

describe('genitori-view api-handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchConsentStatus requests the real user id, not the demo id', async () => {
    mockFetch.mockReturnValue(okJson({ success: true, data: { hasProfile: true } }));

    await fetchConsentStatus(REAL_USER_ID);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain(`userId=${REAL_USER_ID}`);
    expect(url).not.toContain(DEMO_ID);
  });

  it('fetchProfile requests the real user id', async () => {
    mockFetch.mockReturnValue(
      okJson({
        success: true,
        data: { lastUpdated: new Date().toISOString(), strengths: [], growthAreas: [] },
      }),
    );

    await fetchProfile(REAL_USER_ID);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain(`userId=${REAL_USER_ID}`);
    expect(url).not.toContain(DEMO_ID);
  });

  it('generateProfile posts the real user id in the body', async () => {
    mockCsrfFetch.mockReturnValue(okJson({ success: true }));

    await generateProfile(REAL_USER_ID);

    const body = JSON.parse(mockCsrfFetch.mock.calls[0][1].body);
    expect(body.userId).toBe(REAL_USER_ID);
    expect(body.forceRegenerate).toBe(true);
  });

  it('giveConsent posts the real user id', async () => {
    mockCsrfFetch.mockReturnValue(okJson({ success: true }));

    await giveConsent(REAL_USER_ID);

    const body = JSON.parse(mockCsrfFetch.mock.calls[0][1].body);
    expect(body.userId).toBe(REAL_USER_ID);
    expect(body.parentConsent).toBe(true);
  });

  it('requestDeletion sends the real user id', async () => {
    mockCsrfFetch.mockReturnValue(okJson({ success: true }));

    await requestDeletion(REAL_USER_ID);

    const url = mockCsrfFetch.mock.calls[0][0] as string;
    expect(url).toContain(`userId=${REAL_USER_ID}`);
    expect(url).not.toContain(DEMO_ID);
  });

  it('url-encodes ids that contain special characters', async () => {
    mockFetch.mockReturnValue(okJson({ success: true, data: {} }));

    await fetchConsentStatus('user/with space');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('userId=user%2Fwith%20space');
  });
});
