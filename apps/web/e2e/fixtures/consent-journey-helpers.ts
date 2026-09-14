import type { Page } from '@playwright/test';
import { expect } from './consent-fixtures';
import consentMessages from '../../messages/it/consent.json';
import welcomeMessages from '../../messages/it/welcome.json';
import settingsMessages from '../../messages/it/settings.json';

export const consent = consentMessages.consent;
export const welcome = welcomeMessages.welcome;
export const settings = settingsMessages.settings;

export async function acceptRequiredTerms(page: Page) {
  const wall = page.getByTestId('consent-banner');
  await expect(wall).toBeVisible();
  const accept = wall.getByRole('button', { name: consent.terms.modal.buttons.accept });
  await expect(accept).toBeDisabled();
  await wall.getByRole('checkbox', { name: consent.unified.tosCheckbox.label }).check();
  const saved = page.waitForResponse(
    (response) => response.url().endsWith('/api/tos') && response.request().method() === 'POST',
  );
  await accept.click();
  expect((await saved).ok()).toBe(true);
  await expect(wall).toBeHidden();
}

export async function openPrivacy(page: Page) {
  const home = await page.goto('/it');
  expect(home?.status()).toBe(200);
  await page.getByTestId('home-nav-settings').click();
  const gate = page.getByTestId('grown-up-gate');
  await expect(gate).toBeVisible();
  const question = await gate.locator('label[for="grown-up-gate-answer"]').innerText();
  const operands = question.match(/\d+/g)?.map(Number);
  if (!operands || operands.length !== 2) throw new Error('Missing grown-up arithmetic challenge');
  await gate.getByTestId('grown-up-gate-input').fill(String(operands[0] + operands[1]));
  await gate.getByTestId('grown-up-gate-submit').click();
  await expect(gate).toBeHidden();
  await page.getByRole('button', { name: settings.tabs.privacy, exact: true }).click();
  await expect(page.getByRole('switch', { name: settings.privacy.toggleAnalytics })).toBeVisible();
}

export async function savedConsent(page: Page) {
  return page.evaluate(() => {
    const value = localStorage.getItem('mirrorbuddy-unified-consent');
    if (!value) throw new Error('No recorded consent');
    return JSON.parse(value) as {
      tos: { accepted: boolean | null; acceptedAt: string };
      cookies: { analytics: boolean | null; acceptedAt: string };
      pending?: string[];
    };
  });
}
