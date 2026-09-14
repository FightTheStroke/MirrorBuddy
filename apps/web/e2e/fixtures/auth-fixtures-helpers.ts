import { createTestUser } from '../helpers/test-data';
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
