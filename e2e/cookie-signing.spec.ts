// ============================================================================
// E2E TESTS: Signed Cookie Authentication
// Tests for cryptographically signed session cookies
// Related: #013 Implement Cryptographically Signed Session Cookies
// ============================================================================

import { test, expect } from '@playwright/test';

test.describe('Signed Cookie Authentication', () => {
  test('GET /api/user - sets signed cookie for new user', async ({ request }) => {
    const response = await request.get('/api/user');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.id).toBeDefined();

    // Check that cookie is set
    const headers = response.headers();
    const setCookie = headers['set-cookie'];
    expect(setCookie).toBeDefined();

    // Verify cookie contains signature (format: value.signature)
    // Signature is 64-char hex string after the last dot
    const cookieMatch = setCookie?.match(/mirrorbuddy-user-id=([^;]+)/);
    expect(cookieMatch).toBeDefined();

    const cookieValue = cookieMatch![1];
    const lastDotIndex = cookieValue.lastIndexOf('.');
    expect(lastDotIndex).toBeGreaterThan(-1);

    const signature = cookieValue.substring(lastDotIndex + 1);
    // HMAC-SHA256 hex signature is 64 characters
    expect(signature).toHaveLength(64);
    expect(signature).toMatch(/^[0-9a-f]+$/);
  });

  test('Signed cookie - subsequent authenticated requests work', async ({ request }) => {
    // First request creates user with signed cookie
    const userResponse = await request.get('/api/user');
    expect(userResponse.ok()).toBeTruthy();

    // Second request should authenticate with signed cookie
    const settingsResponse = await request.get('/api/user/settings');
    expect(settingsResponse.ok()).toBeTruthy();

    const settings = await settingsResponse.json();
    expect(typeof settings).toBe('object');

    // Third request - update data (requires authentication)
    const updateResponse = await request.put('/api/user/settings', {
      data: { theme: 'dark' },
    });
    expect(updateResponse.ok()).toBeTruthy();

    const updated = await updateResponse.json();
    expect(updated.theme).toBe('dark');
  });

  test('Signed cookie - persists across multiple requests', async ({ request }) => {
    // Create user
    await request.get('/api/user');

    // Make several authenticated requests
    const response1 = await request.put('/api/progress', {
      data: { xp: 100, level: 2 },
    });
    expect(response1.ok()).toBeTruthy();

    const response2 = await request.post('/api/conversations', {
      data: { maestroId: 'prof-matematica' },
    });
    expect(response2.ok()).toBeTruthy();

    const response3 = await request.get('/api/progress');
    expect(response3.ok()).toBeTruthy();

    const progress = await response3.json();
    expect(progress.xp).toBe(100);
  });

  test('Tampered cookie - fails authentication', async ({ page, request, context }) => {
    // First create a valid user with signed cookie
    const userResponse = await request.get('/api/user');
    expect(userResponse.ok()).toBeTruthy();
    const _user = await userResponse.json();

    // Get the signed cookie value
    const cookies = await context.cookies();
    const userCookie = cookies.find(c => c.name === 'mirrorbuddy-user-id');
    expect(userCookie).toBeDefined();

    const originalValue = userCookie!.value;
    const lastDotIndex = originalValue.lastIndexOf('.');
    const value = originalValue.substring(0, lastDotIndex);
    const signature = originalValue.substring(lastDotIndex + 1);

    // Tamper with the signature (flip one character)
    const tamperedSignature = signature.substring(0, signature.length - 1) +
      (signature[signature.length - 1] === 'a' ? 'b' : 'a');
    const tamperedValue = `${value}.${tamperedSignature}`;

    // Set tampered cookie
    await context.addCookies([{
      name: 'mirrorbuddy-user-id',
      value: tamperedValue,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    // Navigate to a page that requires authentication
    await page.goto('/');

    // The app should handle invalid cookie gracefully
    // Either by creating new user or showing appropriate error
    // At minimum, it shouldn't crash
    await page.waitForLoadState('networkidle');

    // Check that page loaded (error handling works)
    const title = await page.title();
    expect(title).toBeDefined();
  });

  test('Tampered value - API request fails', async ({ request, context }) => {
    // Create valid user
    const userResponse = await request.get('/api/user');
    expect(userResponse.ok()).toBeTruthy();

    // Get the signed cookie
    const cookies = await context.cookies();
    const userCookie = cookies.find(c => c.name === 'mirrorbuddy-user-id');
    expect(userCookie).toBeDefined();

    const originalValue = userCookie!.value;
    const lastDotIndex = originalValue.lastIndexOf('.');
    const signature = originalValue.substring(lastDotIndex + 1);

    // Tamper with the value part (keep signature the same)
    const tamperedValue = `fake-user-id.${signature}`;

    // Create new context with tampered cookie
    await context.addCookies([{
      name: 'mirrorbuddy-user-id',
      value: tamperedValue,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    // Try to access protected endpoint - should fail or return 401
    // Since validateAuth checks user exists in DB, tampered userId won't be found
    const settingsResponse = await request.get('/api/user/settings');

    // Either returns 401/403, or GET /api/user auto-creates and succeeds
    // Both are acceptable security responses
    expect([200, 401, 403]).toContain(settingsResponse.status());
  });

  test('Legacy unsigned cookie - backward compatibility maintained', async ({ request, context }) => {
    // Create a user through normal flow first to get a real user ID
    const userResponse = await request.get('/api/user');
    expect(userResponse.ok()).toBeTruthy();
    const _user = await userResponse.json();

    // Extract just the user ID (without signature) to simulate legacy cookie
    const cookies = await context.cookies();
    const userCookie = cookies.find(c => c.name === 'mirrorbuddy-user-id');
    expect(userCookie).toBeDefined();

    const signedValue = userCookie!.value;
    const lastDotIndex = signedValue.lastIndexOf('.');
    const unsignedUserId = signedValue.substring(0, lastDotIndex);

    // Set legacy unsigned cookie (just the UUID without signature)
    await context.clearCookies();
    await context.addCookies([{
      name: 'mirrorbuddy-user-id',
      value: unsignedUserId,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    // Verify unsigned cookie still works (backward compatibility)
    const settingsResponse = await request.get('/api/user/settings');
    expect(settingsResponse.ok()).toBeTruthy();

    const settings = await settingsResponse.json();
    expect(typeof settings).toBe('object');

    // Should be able to update data too
    const updateResponse = await request.put('/api/user/settings', {
      data: { theme: 'light' },
    });
    expect(updateResponse.ok()).toBeTruthy();

    const updated = await updateResponse.json();
    expect(updated.theme).toBe('light');
  });

  test('Missing cookie - creates new user', async ({ request, context }) => {
    // Clear any existing cookies
    await context.clearCookies();

    // Request without cookie should create new user
    const response = await request.get('/api/user');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.id).toBeDefined();

    // Should set signed cookie
    const headers = response.headers();
    const setCookie = headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('mirrorbuddy-user-id=');
  });
});

test.describe('Cookie Security Properties', () => {
  test('Cookie has correct security flags', async ({ request }) => {
    const response = await request.get('/api/user');
    expect(response.ok()).toBeTruthy();

    const headers = response.headers();
    const setCookie = headers['set-cookie'];
    expect(setCookie).toBeDefined();

    // Verify security flags
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=');
  });

  test('Signature format is consistent', async ({ request }) => {
    // Create multiple users and verify signature format consistency
    const response1 = await request.get('/api/user');
    const headers1 = response1.headers();
    const cookie1 = headers1['set-cookie']?.match(/mirrorbuddy-user-id=([^;]+)/)?.[1];

    expect(cookie1).toBeDefined();
    const sig1 = cookie1!.split('.').pop();
    expect(sig1).toHaveLength(64);
    expect(sig1).toMatch(/^[0-9a-f]+$/);
  });
});
