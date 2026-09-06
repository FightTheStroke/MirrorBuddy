/**
 * E2E TESTS: Login/Logout Flow
 * Tests user authentication, form rendering, error handling, and session management
 * F-06: Auth Flow Tests
 */

import { test, expect } from './fixtures/base-fixtures';
import { authenticateTestUser, createCredentialedTestUser } from './helpers/auth-session';
import { cleanupTestData } from './helpers/test-data';

test.describe('Login/Logout Authentication Flow', () => {
  test.afterEach(async () => {
    await cleanupTestData();
  });
  test.beforeEach(async ({ context }) => {
    // Clear cookies for fresh login tests (skip stored auth)
    await context.clearCookies();
  });

  test('Login page renders with form', async ({ page }) => {
    await page.goto('/login');

    // Check form elements exist (login uses email field, not email)
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    // Fill form with invalid credentials (login uses email field)
    // Use valid email format to pass browser validation, but non-existent user
    await page.fill('input#email', 'nonexistent@test.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');

    // Wait for API response
    await page.waitForTimeout(1000);

    // Expect error message to appear (Italian: "Credenziali non valide" or similar)
    // Use .first() to avoid strict mode violation (Next.js route announcer also has role="alert")
    await expect(page.locator('[role="alert"]').first()).toBeVisible();
    await expect(
      page.locator('text=/non valide|invalid|errore|incorrect|unauthorized/i'),
    ).toBeVisible();

    // Should stay on login page
    expect(page.url()).toContain('/login');
  });

  test('Login with valid credentials redirects to home', async ({ page }) => {
    const testUser = await createCredentialedTestUser();

    await page.goto('/login');

    // Fill form with valid credentials (login uses email field)
    await page.fill('input#email', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page).not.toHaveURL(/\/login/);
    const me = await page.request.get('/api/auth/me');
    expect(me.status()).toBe(200);
    expect((await me.json()).user.id).toBe(testUser.id);
    const authCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === 'mirrorbuddy-user-id',
    );
    expect(authCookie?.value).toMatch(/^s2:[\w-]{43}\.[a-f0-9]{64}$/);
  });

  test('Logout from settings redirects to welcome page', async ({ page }) => {
    await authenticateTestUser(page.context());

    // Navigate to settings where logout is available
    await page.goto('/');

    // Wait for app to load and navigate to settings
    await page.waitForLoadState('domcontentloaded');

    // Click settings in sidebar (or navigate directly)
    // The logout button is in Settings > Privacy
    // For simplicity, check if we can access settings page
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });

    // If user-menu (account section) is visible, we can logout
    const userMenu = page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible();

    // Click logout
    await page.click('[data-testid="logout-button"]');

    // Should redirect to welcome page (not login)
    await page.waitForURL(/\/welcome/, { timeout: 5000 });
    expect(page.url()).toContain('/welcome');

    // Session cookie should be cleared
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name === 'mirrorbuddy-user-id');
    expect(authCookie?.value || '').toBe('');
  });

  test('Logout from sidebar redirects to welcome page', async ({ page }) => {
    await authenticateTestUser(page.context());

    // Navigate to home page where sidebar is available
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');

    // Find and click the logout button in sidebar (has aria-label="Esci")
    const logoutButton = page.locator('button[aria-label="Esci"]');
    await expect(logoutButton).toBeVisible();

    // Click logout
    await logoutButton.click();

    // Should redirect to welcome page
    await page.waitForURL(/\/welcome/, { timeout: 5000 });
    expect(page.url()).toContain('/welcome');

    // Session cookie should be cleared
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name === 'mirrorbuddy-user-id');
    expect(authCookie?.value || '').toBe('');
  });

  test('Protected admin page redirects unauthenticated users', async ({ context, page }) => {
    // Clear auth cookies
    await context.clearCookies();

    // Try to access protected admin page (requires authentication)
    await page.goto('/admin/invites');

    // Should redirect to login or show unauthorized
    // Admin pages require authentication
    await Promise.race([
      page.waitForURL(/\/login/, { timeout: 5000 }),
      page.waitForSelector('text=/unauthorized|accesso negato|login/i', {
        timeout: 5000,
      }),
    ]);

    // Either redirected to login or shows unauthorized message
    const isOnLogin = page.url().includes('/login');
    const hasUnauthorized = await page
      .locator('text=/unauthorized|accesso negato/i')
      .isVisible()
      .catch(() => false);

    expect(isOnLogin || hasUnauthorized).toBeTruthy();
  });
});
