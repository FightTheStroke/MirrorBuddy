import type { APIRequestContext, BrowserContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createE2ETestUser } from './e2e-user-factory';
import { trackTestRecord } from './test-data-registry';
import { hashPassword } from '../../src/lib/auth/password';
import { getPrismaClient } from './prisma-setup';
import { issueTestSession, testSessionCookies } from './durable-session';

export async function authenticateTestUser(context: BrowserContext, acceptedTerms = true) {
  const prisma = getPrismaClient();
  const { testUserId } = await createE2ETestUser(prisma);
  trackTestRecord('userIds', testUserId);
  if (!acceptedTerms) await prisma.tosAcceptance.deleteMany({ where: { userId: testUserId } });
  const session = await issueTestSession(prisma, testUserId);
  await context.addCookies(testSessionCookies(session));
  return { id: testUserId };
}

export async function createCredentialedTestUser() {
  const prisma = getPrismaClient();
  const { testUserId, randomSuffix } = await createE2ETestUser(prisma);
  trackTestRecord('userIds', testUserId);
  const password = `Login-${randomUUID()}!`;
  await prisma.user.update({
    where: { id: testUserId },
    data: { passwordHash: await hashPassword(password), mustChangePassword: false },
  });
  return { id: testUserId, email: `e2e-test-${randomSuffix}@example.com`, password };
}

export async function loginTestUser(request: APIRequestContext) {
  const user = await createCredentialedTestUser();
  const csrfResponse = await request.get('/api/session');
  if (!csrfResponse.ok()) throw new Error('Login fixture CSRF setup failed');
  const { csrfToken } = await csrfResponse.json();
  if (typeof csrfToken !== 'string' || !csrfToken)
    throw new Error('Login fixture CSRF token missing');
  const response = await request.post('/api/auth/login', {
    headers: { 'x-csrf-token': csrfToken },
    data: { email: user.email, password: user.password },
  });
  if (!response.ok()) throw new Error(`Login fixture rejected: ${response.status()}`);
  return { response, user };
}
