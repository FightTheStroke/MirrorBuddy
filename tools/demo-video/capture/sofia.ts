import type { Page } from '@playwright/test';
import { createE2ETestUser } from '../../../apps/web/e2e/helpers/e2e-user-factory';
import { getPrismaClient } from '../../../apps/web/e2e/helpers/prisma-setup';
import { issueTestSession, testSessionCookies } from '../../../apps/web/e2e/helpers/durable-session';

export const ORIGIN = 'http://localhost:3100';

/** Fictional demo student, created through the project's own E2E user factory. */
export async function loginAsSofia(page: Page): Promise<string> {
  const prisma = getPrismaClient();
  const { testUserId } = await createE2ETestUser(prisma);
  await prisma.profile.update({ where: { userId: testUserId }, data: { name: 'Sofia', age: 12 } });
  // Registered (Base tier) fictional account: a placeholder hash that matches no password.
  await prisma.user.update({ where: { id: testUserId }, data: { username: `sofia_demo_${Date.now()}`, passwordHash: 'demo-placeholder-not-a-real-credential' } });
  // Under 13: the product requires parental consent before any AI feature (COPPA). Fictional parent.
  await prisma.coppaConsent.create({ data: { userId: testUserId, ageAtConsent: 12, parentEmail: 'genitore.demo@example.com', consentGranted: true, consentGrantedAt: new Date(), verificationMethod: 'in_person' } });
  const session = await issueTestSession(prisma, testUserId);
  await page.context().addCookies(testSessionCookies(session, ORIGIN));
  return testUserId;
}
