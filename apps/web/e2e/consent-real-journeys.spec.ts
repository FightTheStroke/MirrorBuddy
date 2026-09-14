import { test, expect } from './fixtures/consent-fixtures';
import { observeTermsRequests } from './fixtures/consent-request-observer';
import {
  acceptRequiredTerms,
  consent,
  openPrivacy,
  savedConsent,
  settings,
  welcome,
} from './fixtures/consent-journey-helpers';

test('anonymous welcome refuses analytics, explicitly accepts terms, and studies', async ({
  guestPage: page,
}, testInfo) => {
  const terms = await observeTermsRequests(page);
  await page.goto('/it/welcome');
  const analytics = page.getByRole('checkbox', { name: consent.inline.analyticsLabel });
  await expect(analytics).not.toBeChecked();
  const receipt = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/user/consent') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: consent.inline.submitButton }).click();
  const refusal = await receipt;
  expect(refusal.ok()).toBe(true);
  expect(await refusal.json()).toMatchObject({ persisted: false, analyticsAllowed: false });
  expect((await savedConsent(page)).tos.accepted).toBeNull();
  expect(terms.count()).toBe(0);
  await page.getByRole('button', { name: welcome.quickStart.trial.cta }).click();
  await page
    .getByRole('textbox', { name: welcome.quickStart.trial.emailLabel })
    .fill('consent-student@example.com');
  const start = page.getByRole('button', { name: welcome.quickStart.trial.startTrial });
  await expect(start).toBeDisabled();
  await page.getByRole('checkbox', { name: welcome.quickStart.trial.tosLabel }).click();
  const trial = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/trial/session') && response.request().method() === 'POST',
  );
  const onboarding = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/onboarding') && response.request().method() === 'POST',
  );
  await start.click();
  expect((await trial).ok()).toBe(true);
  const accountCreated = await onboarding;
  expect(accountCreated.status()).toBe(200);
  const issuedCookies = (await accountCreated.headersArray())
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value.split('=', 1)[0]);
  expect(issuedCookies).toEqual(
    expect.arrayContaining(['mirrorbuddy-user-id', 'mirrorbuddy-user-id-client']),
  );
  await expect(page).toHaveURL(/\/it\/?$/);
  await expect(page.getByTestId('consent-banner')).toBeHidden();
  expect(await savedConsent(page)).toMatchObject({
    tos: { accepted: true },
    cookies: { analytics: false },
  });
  // Only the paid provider boundary is replaced; trial/terms/consent remain real.
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      json: { content: 'Studiamo insieme le equazioni.', usage: {} },
    }),
  );
  await page.goto('/it/maestri/noether');
  const input = page.locator('textarea');
  await input.fill('Mi aiuti con le equazioni?');
  await input.press('Enter');
  await expect(page.getByText('Studiamo insieme le equazioni.')).toBeVisible();
  const observed = await terms.finish();
  await testInfo.attach('terms-request-context', {
    body: JSON.stringify(observed, null, 2),
    contentType: 'application/json',
  });
  const transition = accountCreated.request().timing();
  expect(transition.responseStart).toBeGreaterThanOrEqual(0);
  expect(observed.requests.length).toBeGreaterThan(0);
  for (const request of observed.requests) {
    expect(request.method).toBe('GET');
    expect(request.authenticatedCookie).toBe(true);
    expect(request.clientHint).toBe(true);
    expect(request.responseStatus).toBe(200);
    expect(request.startedAt).toBeGreaterThanOrEqual(
      transition.startTime + transition.responseStart,
    );
  }
  expect(observed.initiators.length).toBe(observed.requests.length);
  for (const initiator of observed.initiators) {
    expect(initiator.type).toBe('script');
    expect(initiator.frames.length).toBeGreaterThan(0);
  }
});

test('eligible account explicitly opts in and revokes without changing terms', async ({
  accountPage: page,
}) => {
  await page.goto('/it');
  const wall = page.getByTestId('consent-banner');
  await wall.getByRole('button', { name: consent.unified.buttons.rejectAll }).click();
  await expect(wall).toBeVisible();
  expect((await savedConsent(page)).tos.accepted).toBeNull();
  await acceptRequiredTerms(page);
  const terms = (await savedConsent(page)).tos;
  await openPrivacy(page);
  const toggle = page.getByRole('switch', { name: settings.privacy.toggleAnalytics });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  const optIn = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/user/consent') && response.request().method() === 'POST',
  );
  await toggle.click();
  expect(await (await optIn).json()).toMatchObject({ persisted: true, analyticsAllowed: true });
  await expect(page.getByText(consent.sync.persisted)).toBeVisible();
  const revoke = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/user/consent') && response.request().method() === 'POST',
  );
  await toggle.click();
  expect(await (await revoke).json()).toMatchObject({ persisted: true, analyticsAllowed: false });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect((await savedConsent(page)).tos).toEqual(terms);
  await page.reload();
  const server = await page.request.get('/api/user/consent');
  expect(server.ok()).toBe(true);
  expect(await server.json()).toMatchObject({
    consent: { analytics: false },
    analyticsAllowed: false,
  });
});

test('failed save and failed retry stay explicit before real recovery', async ({
  accountPage: page,
}) => {
  await page.goto('/it');
  await acceptRequiredTerms(page);
  await openPrivacy(page);
  let failing = true;
  const requests: string[] = [];
  await page.route('**/api/user/consent', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    requests.push(route.request().postData() ?? '');
    if (failing) return route.fulfill({ status: 403, json: { error: 'Intentional save failure' } });
    return route.continue();
  });
  await page.getByRole('switch', { name: settings.privacy.toggleAnalytics }).click();
  const privacy = page.getByRole('region', { name: settings.privacy.telemetriaEAnalisi });
  await expect(privacy.getByRole('alert')).toHaveText(consent.sync.failed);
  await expect(page.getByText(consent.sync.collectionOff)).toBeVisible();
  await expect(privacy.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await expect(privacy.getByText(consent.sync.persisted)).toHaveCount(0);
  const intent = await savedConsent(page);
  await privacy.getByRole('button', { name: consent.sync.retry }).click();
  await expect.poll(() => requests.length).toBe(2);
  await expect(privacy.getByRole('alert')).toHaveText(consent.sync.failed);
  await expect(privacy.getByText(consent.sync.collectionOff)).toBeVisible();
  await expect(privacy.getByText(consent.sync.persisted)).toHaveCount(0);
  failing = false;
  const recovery = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/user/consent') && response.request().method() === 'POST',
  );
  await privacy.getByRole('button', { name: consent.sync.retry }).click();
  const recovered = await recovery;
  expect(recovered.status()).toBe(200);
  expect(await recovered.json()).toMatchObject({ persisted: true, analyticsAllowed: true });
  await expect(privacy.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText(consent.sync.failed)).toHaveCount(0);
  await expect(privacy.getByText(consent.sync.persisted)).toBeVisible();
  await expect(privacy.getByText(consent.sync.collectionOff)).toHaveCount(0);
  expect(requests).toHaveLength(3);
  expect(new Set(requests).size).toBe(1);
  expect((await savedConsent(page)).cookies).toEqual(intent.cookies);
  expect((await savedConsent(page)).tos).toEqual(intent.tos);
  const server = await page.request.get('/api/user/consent');
  expect(server.status()).toBe(200);
  expect(await server.json()).toMatchObject({
    consent: { analytics: true },
    analyticsAllowed: true,
  });
});
