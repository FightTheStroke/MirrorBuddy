/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture callbacks, not React hooks. */
import { randomInt, randomUUID } from 'crypto';
import { test as base, expect, type Page } from '@playwright/test';
import { createE2ETestUser } from '../helpers/e2e-user-factory';
import { getPrismaClient, disconnectPrisma } from '../helpers/prisma-setup';
import { hashPassword } from '../../src/lib/auth/password';
import { VISITOR_COOKIE_NAME, validateVisitorId } from '../../src/lib/auth/cookie-constants';

interface ConsentFixtures {
  guestPage: Page;
  accountPage: Page;
}

function requireLocalRuntime(baseURL: string | undefined) {
  const database = process.env.TEST_DATABASE_URL;
  if (!database || !baseURL || process.env.NODE_ENV === 'production') {
    throw new Error('Consent fixtures require the dedicated local test runtime');
  }
  const url = new URL(database);
  const local = ['localhost', '127.0.0.1'];
  const allowedDatabases = ['/mirrorbuddy_remediation_47ba2c29', '/mirrorbuddy_test'];
  if (
    !local.includes(url.hostname) ||
    !allowedDatabases.includes(url.pathname) ||
    !local.includes(new URL(baseURL).hostname)
  ) {
    throw new Error('Consent fixtures are restricted to the local remediation runtime');
  }
}

/** Real consent journeys: no consent, onboarding, auth or eligibility route mocks. */
export const test = base.extend<ConsentFixtures>({
  guestPage: async ({ browser, baseURL }, use) => {
    requireLocalRuntime(baseURL);
    // Distinct local test clients must not inherit another visitor's real IP budget.
    const testIp = `2001:db8:${Array.from({ length: 6 }, () =>
      randomInt(0, 65_536).toString(16),
    ).join(':')}`;
    const context = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
      extraHTTPHeaders: { 'x-forwarded-for': testIp },
    });
    try {
      await use(await context.newPage());
    } finally {
      try {
        const visitor = (await context.cookies()).find(
          (cookie) => cookie.name === VISITOR_COOKIE_NAME,
        );
        const visitorId = validateVisitorId(visitor?.value);
        if (visitorId) {
          const prisma = getPrismaClient();
          await prisma.trialSession.deleteMany({ where: { visitorId } });
          expect(await prisma.trialSession.count({ where: { visitorId } })).toBe(0);
        }
      } finally {
        try {
          await context.close();
        } finally {
          await disconnectPrisma();
        }
      }
    }
  },
  accountPage: async ({ browser, baseURL }, use) => {
    requireLocalRuntime(baseURL);
    const prisma = getPrismaClient();
    const context = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    let userId: string | undefined;
    try {
      const created = await createE2ETestUser(prisma);
      userId = created.testUserId;
      const password = `Consent-${randomUUID()}!`;
      const username = `consent_${created.randomSuffix}`;
      await prisma.user.update({
        where: { id: userId },
        data: {
          username,
          passwordHash: await hashPassword(password),
          mustChangePassword: false,
          profile: { update: { age: 16 } },
        },
      });
      await prisma.tosAcceptance.deleteMany({ where: { userId } });
      const session = await context.request.get('/api/session');
      expect(session.ok()).toBe(true);
      const { csrfToken } = await session.json();
      expect(typeof csrfToken).toBe('string');
      const login = await context.request.post('/api/auth/login', {
        headers: { 'x-csrf-token': csrfToken },
        data: { username, password },
      });
      expect(login.status()).toBe(200);
      await use(await context.newPage());
    } finally {
      try {
        await context.close();
      } finally {
        try {
          if (userId) await prisma.user.deleteMany({ where: { id: userId, isTestData: true } });
        } finally {
          await disconnectPrisma();
        }
      }
    }
  },
});

export { expect };
