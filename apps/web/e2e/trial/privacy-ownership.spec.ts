import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/base-fixtures';
import { getPrismaClient, disconnectPrisma } from '../helpers/prisma-setup';
import { TRIAL_CONSENT_COOKIE, VISITOR_COOKIE_NAME } from '../../src/lib/auth/cookie-constants';

async function browserRequest(
  page: Page,
  route: string,
  method = 'GET',
  body?: object,
  csrfToken?: string,
) {
  return page.evaluate(
    async ({ route, method, body, csrfToken }) => {
      const response = await fetch(route, {
        method,
        keepalive: true,
        headers: {
          'content-type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.json() };
    },
    { route, method, body, csrfToken },
  );
}

test.describe('real browser trial privacy and CSRF contracts', () => {
  test.setTimeout(120_000);
  test.afterAll(async () => {
    await disconnectPrisma();
  });

  test('GET is read-only; mutations require consent, CSRF and independent ownership', async ({
    signedOutPage: page,
    baseURL,
  }) => {
    expect(process.env.RESEND_API_KEY || '').toBe('');
    const prisma = getPrismaClient();
    const visitorId = randomUUID();
    const stranger = randomUUID();
    const runId = `${randomUUID()}-compliance`;
    const sessionHash = `hash_${runId.slice(0, 12)}`;
    await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': '198.51.100.42' });
    await page.goto(`${baseURL}/api/session`);
    await page.context().clearCookies();
    await page
      .context()
      .addCookies([{ name: VISITOR_COOKIE_NAME, value: visitorId, url: baseURL!, httpOnly: true }]);
    try {
      const csrf = await browserRequest(page, '/api/session');
      expect(csrf.status).toBe(200);
      const token = csrf.body.csrfToken;
      expect(typeof token).toBe('string');
      expect((await browserRequest(page, '/api/trial/session')).body).toEqual({
        hasSession: false,
      });
      expect((await browserRequest(page, '/api/trial/voice')).body).toMatchObject({
        allowed: false,
      });
      expect(await prisma.trialSession.count({ where: { visitorId } })).toBe(0);
      const denied = await browserRequest(page, '/api/trial/session', 'POST', {}, token);
      expect(denied.status).toBe(403);
      expect(denied.body.error).toContain('privacy');
      expect(await prisma.trialSession.count({ where: { visitorId } })).toBe(0);

      await page.context().addCookies([
        {
          name: TRIAL_CONSENT_COOKIE,
          value: encodeURIComponent('{"accepted":true}'),
          url: baseURL!,
        },
      ]);
      expect((await browserRequest(page, '/api/trial/session', 'POST', {})).status).toBe(403);
      const created = await browserRequest(page, '/api/trial/session', 'POST', {}, token);
      expect(created.status).toBe(200);
      const sessionId: string = created.body.sessionId;
      expect(await prisma.trialSession.count({ where: { id: sessionId, visitorId } })).toBe(1);
      expect((await browserRequest(page, '/api/trial/session')).body.sessionId).toBe(sessionId);
      expect(
        (await browserRequest(page, '/api/trial/voice', 'POST', { durationSeconds: 12 })).status,
      ).toBe(403);
      expect(
        (await browserRequest(page, '/api/trial/voice', 'POST', { durationSeconds: 12 }, token))
          .status,
      ).toBe(200);
      expect(
        (await prisma.trialSession.findUniqueOrThrow({ where: { id: sessionId } }))
          .voiceSecondsUsed,
      ).toBe(12);

      const emailBody = { sessionId, email: 'student@example.test' };
      expect((await browserRequest(page, '/api/trial/email', 'PATCH', emailBody)).status).toBe(403);
      await page
        .context()
        .addCookies([
          { name: VISITOR_COOKIE_NAME, value: stranger, url: baseURL!, httpOnly: true },
        ]);
      expect(
        (await browserRequest(page, '/api/trial/email', 'PATCH', emailBody, token)).status,
      ).toBe(404);
      expect((await browserRequest(page, '/api/trial/session')).body).toEqual({
        hasSession: false,
      });
      expect(
        (await prisma.trialSession.findUniqueOrThrow({ where: { id: sessionId } })).email,
      ).toBeNull();
      await page
        .context()
        .addCookies([
          { name: VISITOR_COOKIE_NAME, value: visitorId, url: baseURL!, httpOnly: true },
        ]);
      const captured = await browserRequest(page, '/api/trial/email', 'PATCH', emailBody, token);
      expect(captured.status).toBe(200);
      expect(captured.body).toMatchObject({ verificationPending: true, emailSent: false });
      expect(
        (await prisma.trialSession.findUniqueOrThrow({ where: { id: sessionId } })).email,
      ).toBe(emailBody.email);

      const crisisBody = { sessionId: runId, maestroId: 'turing' };
      expect(
        (await browserRequest(page, '/api/safety/escalate-voice-crisis', 'POST', crisisBody))
          .status,
      ).toBe(403);
      expect(
        (await browserRequest(page, '/api/safety/escalate-voice-crisis', 'POST', crisisBody, token))
          .status,
      ).toBe(200);
      const eventBody = { type: 'input_warned', severity: 'warning', sessionId: runId };
      expect((await browserRequest(page, '/api/safety/events', 'POST', eventBody)).status).toBe(
        403,
      );
      expect(
        (await browserRequest(page, '/api/safety/events', 'POST', eventBody, token)).status,
      ).toBe(200);
      expect(
        await prisma.safetyEvent.count({ where: { conversationId: runId, type: 'input_warned' } }),
      ).toBe(1);
      await expect
        .poll(() =>
          prisma.safetyEvent.count({
            where: { sessionId: sessionHash, type: 'escalation_crisis_detected' },
          }),
        )
        .toBeGreaterThan(0);
    } finally {
      await prisma.trialSession.deleteMany({ where: { visitorId: { in: [visitorId, stranger] } } });
      await prisma.safetyEvent.deleteMany({
        where: { OR: [{ conversationId: runId }, { sessionId: sessionHash }] },
      });
    }
  });

  test('welcome email caller submits the owned session id from actual activation', async ({
    signedOutPage: page,
    baseURL,
  }) => {
    expect(process.env.RESEND_API_KEY || '').toBe('');
    const prisma = getPrismaClient();
    const visitorId = randomUUID();
    await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': '198.51.100.43' });
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
      await page.locator('#trial-email').fill('welcome@example.test');
      await page.getByRole('checkbox', { name: 'Accetto la', exact: true }).check();
      const capture = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/trial/email') && response.request().method() === 'PATCH',
      );
      await page
        .locator('form')
        .filter({ has: page.locator('#trial-email') })
        .getByRole('button', { name: /inizia|prova/i })
        .click();
      const response = await capture;
      expect(response.status()).toBe(200);
      const payload = response.request().postDataJSON();
      expect(payload.sessionId).toBeTruthy();
      expect(payload.email).toBe('welcome@example.test');
      expect(
        (await prisma.trialSession.findUniqueOrThrow({ where: { id: payload.sessionId } })).email,
      ).toBe(payload.email);
    } finally {
      await prisma.trialSession.deleteMany({ where: { visitorId } });
    }
  });
});
