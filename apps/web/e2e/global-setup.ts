/**
 * Global Setup for E2E Tests
 *
 * Creates a storageState with onboarding completed
 * so tests skip the welcome flow.
 * Also creates the test user in the database (ADR 0081).
 */

import path from 'path';
import fs from 'fs';
import { createHmac } from 'crypto';
import { config } from 'dotenv';
import { getPrismaClient, disconnectPrisma } from './helpers/prisma-setup';
import { createE2ETestUser } from './helpers/e2e-user-factory';

// Load .env so we can read SESSION_SECRET (must match running dev server)
config();

const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'storage-state.json');

// CRITICAL: E2E tests must not depend on the developer's real SESSION_SECRET from .env.
// The Playwright webServer always overrides SESSION_SECRET to this test value.
// Cookie signatures must match between global setup and the running server.
const SESSION_SECRET = 'e2e-test-session-secret-32-characters-min';

/**
 * Sign cookie value for E2E tests (matches src/lib/auth/cookie-signing.ts)
 */
function signCookieValue(value: string): string {
  const hmac = createHmac('sha256', SESSION_SECRET);
  hmac.update(value);
  const signature = hmac.digest('hex');
  return `${value}.${signature}`;
}

async function globalSetup() {
  // PRODUCTION BLOCKER #1: Block if NODE_ENV is production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '🚨 CRITICAL SAFETY ERROR: E2E tests are blocked in production environment.\n' +
        'E2E tests would corrupt real user data, delete sessions, and cause data loss.\n' +
        'Set NODE_ENV=development or NODE_ENV=test to run tests.\n' +
        'Contact DevOps if you believe this is incorrect.',
    );
  }

  // PRODUCTION BLOCKER #2: Require TEST_DATABASE_URL to be set
  const testDbUrl = process.env.TEST_DATABASE_URL || '';

  if (!testDbUrl || testDbUrl.trim() === '') {
    throw new Error(
      '🚨 BLOCKED: TEST_DATABASE_URL is not set!\n' +
        'E2E tests require an explicit test database.\n' +
        'Set TEST_DATABASE_URL=postgresql://roberdan@localhost:5432/mirrorbuddy_test',
    );
  }

  // PRODUCTION BLOCKER #3: TEST_DATABASE_URL must NOT be Supabase
  const hostMatch = testDbUrl.match(/@([^:/?#]+)/);
  const dbHost = hostMatch ? hostMatch[1].toLowerCase() : '';
  const isSupabaseHost = dbHost.endsWith('.supabase.com') || dbHost.endsWith('.supabase.co');

  if (isSupabaseHost) {
    throw new Error(
      '🚨 BLOCKED: TEST_DATABASE_URL contains production Supabase URL!\n' +
        `TEST_DATABASE_URL: ${testDbUrl.substring(0, 50)}...\n` +
        'E2E tests MUST use a local test database.\n' +
        'Set TEST_DATABASE_URL=postgresql://roberdan@localhost:5432/mirrorbuddy_test',
    );
  }

  console.log('✅ Production guards passed. Using test database:', testDbUrl.substring(0, 50));

  // Ensure .auth directory exists
  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create the test user via factory (ADR 0081: isTestData=true, ADR 0059: bypass walls)
  const prisma = getPrismaClient();
  let testUserId: string;
  let randomSuffix: string;
  try {
    const result = await createE2ETestUser(prisma);
    testUserId = result.testUserId;
    randomSuffix = result.randomSuffix;
    console.log('✅ Test user created in database:', testUserId);
  } catch (error) {
    console.error('⚠️ Failed to create test user (may already exist):', error);
    // Fallback: generate IDs locally so storage state can still be written
    randomSuffix = Math.random().toString(36).substring(2, 11);
    testUserId = `e2e-test-user-${Date.now()}-${randomSuffix}`;
  } finally {
    await disconnectPrisma();
  }

  // Sign the test user cookie
  const signedCookie = signCookieValue(testUserId);

  // Create storage state with onboarding completed
  const storageState = {
    cookies: [
      {
        name: 'mirrorbuddy-user-id',
        value: signedCookie,
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'mirrorbuddy-user-id-client',
        value: testUserId,
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'mirrorbuddy-visitor-id',
        value: `e2e-test-visitor-${randomSuffix}`,
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'mirrorbuddy-a11y',
        value: encodeURIComponent(
          JSON.stringify({
            version: '1',
            activeProfile: null,
            overrides: {
              dyslexiaFont: false,
              highContrast: false,
              largeText: false,
              reducedMotion: false,
            },
            browserDetectedApplied: true,
          }),
        ),
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
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
                  name: 'Test User',
                  age: 12,
                  schoolLevel: 'media',
                  learningDifferences: [],
                  gender: 'other',
                },
              },
              version: 0,
            }),
          },
          {
            name: 'mirrorbuddy-unified-consent',
            value: JSON.stringify({
              version: '1.0',
              tos: {
                accepted: true,
                version: '1.0',
                acceptedAt: new Date().toISOString(),
              },
              cookies: {
                essential: true,
                analytics: true,
                acceptedAt: new Date().toISOString(),
              },
            }),
          },
        ],
      },
    ],
  };

  fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));

  console.log('Global setup complete: onboarding state saved to', STORAGE_STATE_PATH);
}

export default globalSetup;
