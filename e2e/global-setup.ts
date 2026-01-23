/**
 * Global Setup for E2E Tests
 *
 * Creates a storageState with onboarding completed
 * so tests skip the welcome flow.
 */

import path from "path";
import fs from "fs";
import { createHmac, randomUUID } from "crypto";

const STORAGE_STATE_PATH = path.join(__dirname, ".auth", "storage-state.json");

// Must match playwright.config.ts SESSION_SECRET
const E2E_SESSION_SECRET = "e2e-test-session-secret-32-characters-min";

/**
 * Sign cookie value for E2E tests (matches src/lib/auth/cookie-signing.ts)
 */
function signCookieValue(value: string): string {
  const hmac = createHmac("sha256", E2E_SESSION_SECRET);
  hmac.update(value);
  const signature = hmac.digest("hex");
  return `${value}.${signature}`;
}

async function globalSetup() {
  // PRODUCTION BLOCKER #1: Block if NODE_ENV is production
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "🚨 CRITICAL SAFETY ERROR: E2E tests are blocked in production environment.\n" +
        "E2E tests would corrupt real user data, delete sessions, and cause data loss.\n" +
        "Set NODE_ENV=development or NODE_ENV=test to run tests.\n" +
        "Contact DevOps if you believe this is incorrect.",
    );
  }

  // PRODUCTION BLOCKER #2: Require TEST_DATABASE_URL to be set
  const testDbUrl = process.env.TEST_DATABASE_URL || "";

  if (!testDbUrl || testDbUrl.trim() === "") {
    throw new Error(
      "🚨 BLOCKED: TEST_DATABASE_URL is not set!\n" +
        "E2E tests require an explicit test database.\n" +
        "Set TEST_DATABASE_URL=postgresql://roberdan@localhost:5432/mirrorbuddy_test",
    );
  }

  // PRODUCTION BLOCKER #3: TEST_DATABASE_URL must NOT be Supabase
  if (testDbUrl.includes("supabase.com") || testDbUrl.includes("supabase.co")) {
    throw new Error(
      "🚨 BLOCKED: TEST_DATABASE_URL contains production Supabase URL!\n" +
        `TEST_DATABASE_URL: ${testDbUrl.substring(0, 50)}...\n` +
        "E2E tests MUST use a local test database.\n" +
        "Set TEST_DATABASE_URL=postgresql://roberdan@localhost:5432/mirrorbuddy_test",
    );
  }

  // Note: DATABASE_URL may contain Supabase production URL from .env, but playwright.config.ts
  // webServer.env overrides it with TEST_DATABASE_URL for the actual server process

  console.log(
    "✅ Production guards passed. Using test database:",
    testDbUrl.substring(0, 50),
  );

  // Ensure .auth directory exists
  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Generate unique test user ID per run to avoid conflicts with stale data
  // All workers share this ID (loaded from storage-state.json)
  const randomSuffix = randomUUID().replace(/-/g, "").substring(0, 9);
  const testUserId = `e2e-test-user-${Date.now()}-${randomSuffix}`;

  // Sign the test user cookie
  const signedCookie = signCookieValue(testUserId);

  // Create storage state with onboarding completed
  const storageState = {
    cookies: [
      {
        // Server-side auth cookie (signed)
        name: "mirrorbuddy-user-id",
        value: signedCookie,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
      {
        // Client-readable cookie (not signed, for JS access)
        name: "mirrorbuddy-user-id-client",
        value: testUserId,
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
      {
        // Accessibility settings bypass (ADR 0060)
        name: "mirrorbuddy-a11y",
        value: encodeURIComponent(
          JSON.stringify({
            version: "1",
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
        domain: "localhost",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ],
    origins: [
      {
        origin: "http://localhost:3000",
        localStorage: [
          {
            name: "mirrorbuddy-onboarding",
            value: JSON.stringify({
              state: {
                hasCompletedOnboarding: true,
                onboardingCompletedAt: new Date().toISOString(),
                currentStep: "ready",
                isReplayMode: false,
                data: {
                  name: "Test User",
                  age: 12,
                  schoolLevel: "media",
                  learningDifferences: [],
                  gender: "other",
                },
              },
              version: 0,
            }),
          },
          {
            // Unified consent (TOS + Cookie) - matches unified-consent-storage.ts
            name: "mirrorbuddy-unified-consent",
            value: JSON.stringify({
              version: "1.0",
              tos: {
                accepted: true,
                version: "1.0",
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

  // Write storage state file
  fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));

  console.log(
    "Global setup complete: onboarding state saved to",
    STORAGE_STATE_PATH,
  );
}

export default globalSetup;
