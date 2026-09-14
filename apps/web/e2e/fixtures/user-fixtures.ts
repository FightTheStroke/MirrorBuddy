/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect } from './base-fixtures';
import { createE2ETestUser } from '../helpers/e2e-user-factory';
import { getPrismaClient } from '../helpers/prisma-setup';
import { issueTestSession, testSessionCookies } from '../helpers/durable-session';
import { trackTestRecord } from '../helpers/test-data-registry';
import { cleanupTestData } from '../helpers/test-data';

/** API mutation suites own their account, so reset/logout/delete cannot poison shared state. */
export const test = base.extend({
  request: async (
    { playwright, baseURL, extraHTTPHeaders, ignoreHTTPSErrors, httpCredentials, proxy, userAgent },
    use,
  ) => {
    try {
      const prisma = getPrismaClient();
      const { testUserId } = await createE2ETestUser(prisma);
      trackTestRecord('userIds', testUserId);
      const issued = await issueTestSession(prisma, testUserId);
      const request = await playwright.request.newContext({
        baseURL,
        extraHTTPHeaders,
        ignoreHTTPSErrors,
        httpCredentials,
        proxy,
        userAgent,
        storageState: { cookies: testSessionCookies(issued, baseURL), origins: [] },
      });
      try {
        await use(request);
      } finally {
        await request.dispose();
      }
    } finally {
      await cleanupTestData();
    }
  },
});
export { expect };
