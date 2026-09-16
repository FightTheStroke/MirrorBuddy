import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures/base-fixtures';
import { getPrismaClient, disconnectPrisma } from '../helpers/prisma-setup';
import { createE2ETestUser } from '../helpers/e2e-user-factory';
import { issueTestSession, testSessionCookies } from '../helpers/durable-session';
import { AUTH_COOKIE_CLIENT, VISITOR_COOKIE_NAME } from '../../src/lib/auth/cookie-constants';

test.describe('optional email never blocks essential onboarding', () => {
  test.setTimeout(90_000);
  test.afterAll(async () => {
    await disconnectPrisma();
  });

  test('real email API delivery failure still completes onboarding', async ({
    signedOutPage: page,
    baseURL,
  }) => {
    const prisma = getPrismaClient();
    const visitorId = randomUUID();
    const startedAt = new Date();
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': '198.51.100.44' });
    await page.goto(`${baseURL}/api/session`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
    await page
      .context()
      .addCookies([{ name: VISITOR_COOKIE_NAME, value: visitorId, url: baseURL!, httpOnly: true }]);
    try {
      await page.goto(`${baseURL}/it/welcome`);
      await page.getByRole('button', { name: /Prova gratis/i }).click();
      await page.locator('#trial-email').fill('optional-failure@example.test');
      await page.getByRole('checkbox', { name: 'Accetto la', exact: true }).check();
      const emailResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/trial/email') && response.request().method() === 'PATCH',
      );
      const onboardingResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/onboarding') && response.request().method() === 'POST',
      );
      await page
        .locator('form')
        .filter({ has: page.locator('#trial-email') })
        .getByRole('button', { name: /inizia|prova/i })
        .click();
      const email = await emailResponse;
      expect(email.status()).toBe(500);
      expect(await email.json()).toMatchObject({ error: 'Failed to save email' });
      const onboarding = await onboardingResponse;
      expect(onboarding.status()).toBe(200);
      expect(await onboarding.json()).toMatchObject({
        success: true,
        onboardingState: { hasCompletedOnboarding: true },
      });
      const payload = email.request().postDataJSON();
      const ownedTrial = await prisma.trialSession.findUniqueOrThrow({
        where: { id: payload.sessionId },
      });
      expect(ownedTrial.visitorId).toBe(visitorId);
      expect(ownedTrial.emailVerifiedAt).toBeNull();
      const owner = (await page.context().cookies()).find(
        (cookie) => cookie.name === AUTH_COOKIE_CLIENT,
      )?.value;
      expect(owner).toBeTruthy();
      expect(await prisma.onboardingState.findUnique({ where: { userId: owner! } })).toMatchObject({
        hasCompletedOnboarding: true,
      });
      await expect(page).toHaveURL(new RegExp(`^${baseURL}/(?:it)?/?$`));
      expect(
        warnings.some((warning) => warning.includes('Optional trial email capture failed')),
      ).toBe(true);
    } finally {
      const owner = (await page.context().cookies()).find(
        (cookie) => cookie.name === AUTH_COOKIE_CLIENT,
      )?.value;
      await prisma.trialSession.deleteMany({ where: { visitorId } });
      if (owner)
        await prisma.user.deleteMany({
          where: { id: owner, username: null, createdAt: { gte: startedAt } },
        });
    }
  });

  test('returning user with stale email and no owned trial skips capture without creating a session', async ({
    signedOutPage: page,
    baseURL,
  }) => {
    const prisma = getPrismaClient();
    const { testUserId } = await createE2ETestUser(prisma);
    const issued = await issueTestSession(prisma, testUserId);
    const visitorId = randomUUID();
    const requests: string[] = [];
    const warnings: string[] = [];
    page.on('request', (request) => {
      requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text());
    });
    await page.goto(`${baseURL}/api/session`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem('mirrorbuddy-trial-email', 'stale@example.test');
    });
    await page.context().clearCookies();
    await page
      .context()
      .addCookies([
        ...testSessionCookies(issued, baseURL),
        { name: VISITOR_COOKIE_NAME, value: visitorId, url: baseURL!, httpOnly: true },
      ]);
    try {
      await page.goto(`${baseURL}/it/welcome`);
      const trialResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/trial/session') && response.request().method() === 'GET',
      );
      const onboardingResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/onboarding') && response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: "Vai all'app", exact: true }).click();
      const trial = await trialResponse;
      expect(trial.status()).toBe(200);
      expect(await trial.json()).toEqual({ hasSession: false });
      expect((await onboardingResponse).status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`^${baseURL}/(?:it)?/?$`));
      expect(requests).not.toContain('POST /api/trial/session');
      expect(requests).not.toContain('PATCH /api/trial/email');
      expect(await prisma.trialSession.count({ where: { visitorId } })).toBe(0);
      expect(
        warnings.some((warning) => warning.includes('capture skipped: no owned session')),
      ).toBe(true);
    } finally {
      await prisma.user.deleteMany({ where: { id: testUserId, isTestData: true } });
    }
  });
});
