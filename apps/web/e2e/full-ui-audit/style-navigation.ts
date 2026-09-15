import type { Page } from '@playwright/test';
import { expect } from '../fixtures/base-fixtures';

const REDIRECT_DESTINATIONS: Record<string, string> = {
  '/landing': '/welcome',
  '/study-kit': '/astuccio',
  '/homework': '/astuccio',
};

export async function navigateForStyleAudit(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  const destination = REDIRECT_DESTINATIONS[path] ?? path;
  await expect(page).toHaveURL((url) => {
    const pathname = url.pathname.replace(/^\/(it|en|fr|de|es)(?=\/|$)/, '').replace(/\/$/, '');
    return pathname === destination.replace(/\/$/, '');
  });
}
