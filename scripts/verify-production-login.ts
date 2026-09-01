import { chromium, request as playwrightRequest } from '@playwright/test';

const AUTH_COOKIE_NAME = 'mirrorbuddy-user-id';
const PROD_URL = process.env.PROD_URL || 'https://mirrorbuddy.vercel.app';
const PLAYWRIGHT_CHANNEL =
  process.env.PLAYWRIGHT_CHANNEL ?? (process.env.CI ? undefined : 'msedge');

type ExpectedIdentity = {
  id: string;
  email: string;
  username: string;
  password: string;
  cookie: string;
};

type UserPayload = {
  id?: string;
  email?: string | null;
  username?: string | null;
  isTestData?: boolean;
};

function requiredIdentity(): ExpectedIdentity {
  const identity = {
    id: process.env.PROD_TEST_USER_ID,
    email: process.env.PROD_TEST_USER_EMAIL,
    username: process.env.PROD_TEST_USER_USERNAME,
    password: process.env.PROD_TEST_USER_PASSWORD,
    cookie: process.env.PROD_TEST_USER_COOKIE_VALUE,
  };

  if (
    !identity.id ||
    !identity.email ||
    !identity.username ||
    !identity.password ||
    !identity.cookie
  ) {
    throw new Error('configuration');
  }

  return identity as ExpectedIdentity;
}

function matchesIdentity(user: UserPayload, expected: ExpectedIdentity) {
  return (
    user.id === expected.id &&
    user.username === expected.username &&
    user.email?.toLowerCase() === expected.email.toLowerCase() &&
    user.isTestData === true
  );
}

async function verifyProductionLogin() {
  let stage = 'configuration';
  let api: Awaited<ReturnType<typeof playwrightRequest.newContext>> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;

  try {
    const expected = requiredIdentity();

    stage = 'cookie identity verification';
    api = await playwrightRequest.newContext({
      baseURL: PROD_URL,
      extraHTTPHeaders: {
        Cookie: `${AUTH_COOKIE_NAME}=${expected.cookie}`,
      },
    });
    const cookieUserResponse = await api.get('/api/user', { timeout: 30000 });
    if (cookieUserResponse.status() !== 200) throw new Error(stage);
    const cookieUser = (await cookieUserResponse.json()) as UserPayload;
    if (!matchesIdentity(cookieUser, expected)) throw new Error(stage);
    await api.dispose();
    api = undefined;

    stage = 'browser launch';
    browser = await chromium.launch({
      headless: true,
      ...(PLAYWRIGHT_CHANNEL ? { channel: PLAYWRIGHT_CHANNEL } : {}),
    });
    const context = await browser.newContext({
      baseURL: PROD_URL,
      locale: 'it-IT',
    });
    const page = await context.newPage();
    await page.route('**/api/telemetry/activity', async (route) => {
      await route.fulfill({ status: 204 });
    });

    stage = 'credential submission';
    await page.goto('/it/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByLabel(/email/i).fill(expected.email);
    await page.locator('#password').fill(expected.password);
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 30000 },
    );
    await page.getByRole('button', { name: /accedi/i }).click();
    const loginResponse = await loginResponsePromise;
    if (loginResponse.status() !== 200) throw new Error(stage);
    const loginBody = (await loginResponse.json()) as { user?: UserPayload };
    if (loginBody.user?.id !== expected.id) throw new Error(stage);

    stage = 'session verification';
    await page.waitForURL(/\/it\/?$/, { timeout: 15000 });
    const sessionResponse = await page.request.get('/api/user', { timeout: 30000 });
    if (sessionResponse.status() !== 200) throw new Error(stage);
    const sessionUser = (await sessionResponse.json()) as UserPayload;
    if (!matchesIdentity(sessionUser, expected)) throw new Error(stage);

    await context.close();
    await browser.close();
    browser = undefined;
    console.log('PASS production login verification');
  } catch {
    await api?.dispose().catch(() => {});
    await browser?.close().catch(() => {});
    console.error(`FAIL production login verification (${stage})`);
    process.exitCode = 1;
  }
}

void verifyProductionLogin();
