import { test, expect } from './fixtures/base-fixtures';
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLIENT,
  LEGACY_AUTH_COOKIE,
} from '../src/lib/auth/cookie-constants';
import messages from '../messages/it/common.json';

test('visible current logout recovers from a server-rejected credential', async ({
  page,
  context,
  baseURL,
  request,
}) => {
  if (!baseURL) throw new Error('The browser regression requires the configured local server');
  await context.clearCookies({ name: LEGACY_AUTH_COOKIE });
  await context.addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: `s2:${'x'.repeat(43)}.${'0'.repeat(64)}`,
      url: baseURL,
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 3600,
    },
  ]);
  const rejected = await page.request.get('/api/user');
  expect(rejected.status()).toBe(401);

  await page.goto('/it');
  const notice = page.getByRole('alert').filter({
    hasText: messages.common.session.unavailable,
  });
  await expect(notice).toBeVisible();
  const current = notice.getByRole('button', {
    name: messages.common.session.logoutCurrent,
    exact: true,
  });
  await expect(current).toBeEnabled();
  await expect(
    page.getByRole('button', {
      name: messages.common.session.logoutAll,
      exact: true,
      disabled: false,
    }),
  ).toHaveCount(0);
  let logoutResponse: Awaited<ReturnType<typeof request.fetch>> | undefined;
  await page.route('**/api/auth/logout', async (route) => {
    // Retain the real body across navigation without changing the browser's cookie jar.
    logoutResponse = await request.fetch(route.request(), { maxRetries: 0 });
    await route.fulfill({ response: logoutResponse });
  });
  const receipt = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/logout') && response.request().method() === 'POST',
  );
  await current.click();
  const response = await receipt;
  expect(response.request().postDataJSON()).toMatchObject({ scope: 'current' });
  expect(response.status()).toBe(200);
  if (!logoutResponse) throw new Error('The real logout response was not captured');
  expect(await logoutResponse.json()).toMatchObject({ success: true });
  await expect(page).toHaveURL(/\/it\/welcome(?:[/?#]|$)/);
  const names = (await context.cookies()).map((cookie) => cookie.name);
  for (const name of [AUTH_COOKIE_NAME, AUTH_COOKIE_CLIENT, LEGACY_AUTH_COOKIE]) {
    expect(names).not.toContain(name);
  }
  await expect(page.getByText(messages.common.session.logoutFailed, { exact: true })).toHaveCount(
    0,
  );
});
