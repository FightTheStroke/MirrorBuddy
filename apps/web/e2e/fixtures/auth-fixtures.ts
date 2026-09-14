/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from './user-fixtures';
import type { Page, APIRequestContext } from '@playwright/test';
import {
  getTrialStorageState,
  getTrialUserStorageState,
  getAdminStorageState,
} from './auth-fixtures-helpers';
import { cleanupTestData } from '../helpers/test-data';

interface AuthFixtures {
  trialPage: Page;
  /** A trial student that already owns a guest session, as production issues one. */
  trialHomePage: Page;
  adminPage: Page;
  adminRequest: APIRequestContext;
}

export const test = base.extend<AuthFixtures>({
  trialPage: async ({ page }, use) => {
    await page.context().clearCookies({
      name: /^(mirrorbuddy-user-id|mirrorbuddy-user-id-client|convergio-user-id)$/,
    });
    const state = getTrialStorageState();
    await page.context().addCookies(state.cookies);
    await page.context().addInitScript((entries) => {
      for (const item of entries) localStorage.setItem(item.name, item.value);
    }, state.origins[0].localStorage);
    await use(page);
  },
  trialHomePage: async ({ page, baseURL }, use) => {
    const state = await getTrialUserStorageState(baseURL);
    await page.context().addCookies(state.cookies);
    await page.context().addInitScript((entries) => {
      for (const item of entries) localStorage.setItem(item.name, item.value);
    }, state.origins[0].localStorage);
    await use(page);
  },
  adminPage: async ({ page, baseURL }, use) => {
    try {
      const state = await getAdminStorageState(baseURL);
      await page.context().addCookies(state.cookies);
      await page.context().addInitScript((entries) => {
        for (const item of entries) localStorage.setItem(item.name, item.value);
      }, state.origins[0].localStorage);
      await use(page);
    } finally {
      await cleanupTestData();
    }
  },
  adminRequest: async ({ playwright, baseURL }, use) => {
    try {
      const storageState = await getAdminStorageState(baseURL);
      const context = await playwright.request.newContext({ baseURL, storageState });
      try {
        await use(context);
      } finally {
        await context.dispose();
      }
    } finally {
      await cleanupTestData();
    }
  },
});

export { expect, getTrialStorageState, getTrialUserStorageState, getAdminStorageState };
