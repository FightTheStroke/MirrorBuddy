import { createTestUser } from '../helpers/test-data';
import { trackTestRecord } from '../helpers/test-data-registry';
import { createE2ETestUser } from '../helpers/e2e-user-factory';
import { getPrismaClient } from '../helpers/prisma-setup';
import { issueTestSession, testSessionCookies } from '../helpers/durable-session';

export function getTrialStorageState() {
  return {
    cookies: [
      {
        name: 'mirrorbuddy-a11y',
        value: encodeURIComponent(
          JSON.stringify({
            version: '1',
            activeProfile: null,
            overrides: {},
            browserDetectedApplied: true,
          }),
        ),
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'mirrorbuddy-onboarding',
            value: JSON.stringify({
              state: {
                hasCompletedOnboarding: true,
                onboardingCompletedAt: new Date().toISOString(),
                currentStep: 'ready',
                isReplayMode: false,
                data: {
                  name: 'Trial User',
                  age: 15,
                  schoolLevel: 'media',
                  learningDifferences: [],
                  gender: 'other',
                },
              },
              version: 0,
            }),
          },
          {
            name: 'mirrorbuddy-consent',
            value: JSON.stringify({
              version: '1.0',
              acceptedAt: new Date().toISOString(),
              essential: true,
              analytics: false,
              marketing: false,
            }),
          },
        ],
      },
    ],
  };
}

/**
 * A trial student in production is not anonymous: the welcome flow issues a guest
 * session (see `createGuestSession` in the onboarding route), and the onboarding
 * store only hydrates for a user it can identify. A cookie-less context therefore
 * bounces off the child home to /welcome, which is correct behaviour and not what
 * the trial specs mean to exercise. Use `signedOutPage` for a first-time visitor.
 */
export async function getTrialUserStorageState(origin = 'http://localhost:3000') {
  const prisma = getPrismaClient();
  // The shared factory also records onboarding and the ToS acceptance, without
  // which the unified consent wall covers the page under test.
  const { testUserId } = await createE2ETestUser(prisma);
  trackTestRecord('userIds', testUserId);
  const issued = await issueTestSession(prisma, testUserId);
  const state = getTrialStorageState();
  return {
    cookies: [...testSessionCookies(issued, origin), ...state.cookies],
    origins: state.origins.map((item) => ({ ...item, origin })),
  };
}

/** Every admin fixture owns an actual marked test account; the reader never provisions it. */
export async function getAdminStorageState(origin = 'http://localhost:3000') {
  const user = await createTestUser({ role: 'ADMIN', name: 'Admin Test User', age: 35 });
  const issued = await issueTestSession(getPrismaClient(), user.id);
  const state = getTrialStorageState();
  return {
    cookies: [...testSessionCookies(issued, origin), ...state.cookies],
    origins: state.origins.map((item) => ({ ...item, origin })),
  };
}
