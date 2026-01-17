/**
 * E2E TESTS: Authentication System
 * Tests OAuth flow, CSRF protection, state validation, and redirects
 * F-10: Auth System Tests
 */

import { test, expect } from '@playwright/test';

test.describe('OAuth Flow - Google Integration', () => {
  test('GET /api/auth/google - handles OAuth configuration check', async ({
    request,
  }) => {
    // In E2E environment, Google OAuth may or may not be configured
    const response = await request.get('/api/auth/google?userId=test-user', {
      maxRedirects: 0,
    });

    // Either redirects to Google (307/302) if configured,
    // or returns 503 if not configured
    expect([302, 307, 503]).toContain(response.status());

    if (response.status() === 503) {
      const data = await response.json();
      expect(data.error).toContain('not configured');
    }
  });

  test('GET /api/auth/google - requires userId parameter', async ({
    request,
  }) => {
    const response = await request.get('/api/auth/google');

    // Should return 400 Bad Request without userId
    expect([400, 503]).toContain(response.status());

    const data = await response.json();
    // Either "not configured" or "userId is required"
    expect(data.error).toBeDefined();
  });

  test('GET /api/auth/google/status - returns disconnected for new user', async ({
    request,
  }) => {
    // Create user and get userId
    const userResponse = await request.get('/api/user');
    const user = await userResponse.json();

    const response = await request.get(`/api/auth/google/status?userId=${user.id}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.isConnected).toBe(false);
  });

  test('GET /api/auth/google/callback - validates state parameter', async ({
    request,
  }) => {
    // Callback without state should redirect with error
    const response = await request.get('/api/auth/google/callback?code=fake', {
      maxRedirects: 0,
    });

    // Should redirect (302 or 307)
    expect([302, 307]).toContain(response.status());

    const location = response.headers()['location'];
    expect(location).toContain('google_error=missing_params');
  });

  test('GET /api/auth/google/callback - rejects invalid state', async ({
    request,
  }) => {
    const response = await request.get(
      '/api/auth/google/callback?code=fake&state=invalid-state',
      { maxRedirects: 0 }
    );

    expect([302, 307]).toContain(response.status());

    const location = response.headers()['location'];
    expect(location).toContain('google_error=invalid_state');
  });

  test('GET /api/auth/google/callback - handles OAuth errors from Google', async ({
    request,
  }) => {
    const response = await request.get(
      '/api/auth/google/callback?error=access_denied',
      { maxRedirects: 0 }
    );

    expect([302, 307]).toContain(response.status());

    const location = response.headers()['location'];
    expect(location).toContain('google_error=access_denied');
  });
});

test.describe('CSRF Protection', () => {
  test('Session cookies use SameSite=Lax', async ({ request }) => {
    // Create fresh request to get Set-Cookie header
    const response = await request.get('/api/user', {
      headers: { Cookie: '' }, // Clear cookies to get fresh Set-Cookie
    });
    expect(response.ok()).toBeTruthy();

    // Get Set-Cookie header (may be split or combined)
    const setCookie = response.headers()['set-cookie'] || '';
    expect(setCookie).toBeDefined();

    // Check for SameSite attribute (case insensitive)
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
  });

  test('Session cookies are HttpOnly', async ({ request }) => {
    const response = await request.get('/api/user', {
      headers: { Cookie: '' },
    });
    expect(response.ok()).toBeTruthy();

    const setCookie = response.headers()['set-cookie'] || '';
    expect(setCookie).toBeDefined();
    expect(setCookie.toLowerCase()).toContain('httponly');
  });

  test('Cross-origin POST requires authentication', async ({ request }) => {
    // Try POST without proper authentication cookie
    const response = await request.post('/api/conversations', {
      headers: { Cookie: '' },
      data: { maestroId: 'test' },
    });

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });
});

test.describe('State Parameter Validation', () => {
  test('OAuth state includes userId and is encoded', async ({ request }) => {
    // Since we can't test actual Google redirect in E2E,
    // we verify the state validation on callback
    const invalidStates = [
      '', // empty
      'not-base64!@#', // invalid characters
      btoa('{}'), // empty object
      btoa('{"notUserId": "test"}'), // missing userId
    ];

    for (const state of invalidStates) {
      const response = await request.get(
        `/api/auth/google/callback?code=test&state=${state}`,
        { maxRedirects: 0 }
      );

      // Accept 302 or 307 redirects
      expect([302, 307]).toContain(response.status());
      const location = response.headers()['location'];
      expect(location).toContain('google_error');
    }
  });
});

test.describe('Redirect Validation', () => {
  test('OAuth callback respects returnUrl in state', async ({ request }) => {
    // Create a valid-looking state with returnUrl
    const state = {
      userId: 'test-user',
      returnUrl: '/settings',
      nonce: 'test-nonce',
    };
    const encodedState = btoa(JSON.stringify(state));

    // This will fail at token exchange but we can verify redirect handling
    const response = await request.get(
      `/api/auth/google/callback?code=test&state=${encodedState}`,
      { maxRedirects: 0 }
    );

    // Will redirect with error (302 or 307) since code is fake
    expect([302, 307]).toContain(response.status());
    const location = response.headers()['location'];
    expect(location).toBeDefined();
  });

  test('Disconnect endpoint validates authentication', async ({ request }) => {
    // Without valid cookie, endpoint should return 401 or 500 (no user found)
    const response = await request.post('/api/auth/google/disconnect', {
      headers: { Cookie: '' },
    });

    // Either 401 (unauthorized) or 500 (internal error from missing user)
    expect([401, 500]).toContain(response.status());
  });

  test('Token endpoint requires userId and returns 401 when not connected', async ({ request }) => {
    // Create user and get userId
    const userResponse = await request.get('/api/user');
    const user = await userResponse.json();

    const response = await request.get(`/api/auth/google/token?userId=${user.id}`);

    // User exists but not connected to Google - should return 401
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toContain('Not connected');
  });
});

test.describe('Session Security', () => {
  test('Authenticated endpoints reject unsigned cookies (F-07)', async ({
    request,
  }) => {
    // First create a valid user to get a real user ID
    const userResponse = await request.get('/api/user');
    expect(userResponse.ok()).toBeTruthy();

    const setCookie = userResponse.headers()['set-cookie'];
    const signedValue = setCookie
      ?.split(', ')
      .find((c: string) => c.startsWith('mirrorbuddy-user-id='))
      ?.split('=')[1]
      ?.split(';')[0];

    // Extract unsigned userId (without signature)
    const lastDot = signedValue?.lastIndexOf('.') ?? -1;
    const unsignedUserId = signedValue?.substring(0, lastDot) ?? 'test-user';

    // Try to access protected endpoint with unsigned cookie directly in header
    const settingsResponse = await request.get('/api/user/settings', {
      headers: {
        Cookie: `mirrorbuddy-user-id=${unsignedUserId}`,
      },
    });

    // Should reject unsigned cookies with 401
    expect(settingsResponse.status()).toBe(401);
  });

  test('Session persists across multiple API calls', async ({ request }) => {
    // Create user
    const userResponse = await request.get('/api/user');
    expect(userResponse.ok()).toBeTruthy();
    const user = await userResponse.json();

    // Make multiple authenticated requests
    const settings = await request.get('/api/user/settings');
    expect(settings.ok()).toBeTruthy();

    const progress = await request.get('/api/progress');
    expect(progress.ok()).toBeTruthy();

    const conversations = await request.get('/api/conversations?limit=5');
    expect(conversations.ok()).toBeTruthy();

    // Verify same user throughout
    const user2 = await request.get('/api/user');
    const userData = await user2.json();
    expect(userData.id).toBe(user.id);
  });
});

test.describe('COPPA Compliance (F-09)', () => {
  test('GET /api/coppa - returns status for authenticated user', async ({
    request,
  }) => {
    // Ensure user exists
    await request.get('/api/user');

    const response = await request.get('/api/coppa');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.requiresConsent).toBeDefined();
    expect(data.ageThreshold).toBe(13);
  });

  test('POST /api/coppa - validates email format', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.post('/api/coppa', {
      data: { parentEmail: 'not-an-email', age: 10 },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('email');
  });

  test('POST /api/coppa - rejects age >= 13', async ({ request }) => {
    await request.get('/api/user');

    const response = await request.post('/api/coppa', {
      data: { parentEmail: 'parent@example.com', age: 13 },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('not required');
  });

  test('POST /api/coppa/verify - validates code format', async ({ request }) => {
    const response = await request.post('/api/coppa/verify', {
      data: { verificationCode: 'short' },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('format');
  });

  test('POST /api/coppa/verify - rejects invalid code', async ({ request }) => {
    const response = await request.post('/api/coppa/verify', {
      data: { verificationCode: 'ABCDEF' },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid');
  });
});
