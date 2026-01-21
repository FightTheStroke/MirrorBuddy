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
  // ENVIRONMENT GUARD: Block tests in production (F-03)
  // E2E tests MUST never run in production - they corrupt real user data
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CRITICAL SAFETY ERROR: E2E tests are blocked in production environment.\n" +
        "E2E tests would corrupt real user data, delete sessions, and cause data loss.\n" +
        "Set NODE_ENV=development or NODE_ENV=test to run tests.\n" +
        "Contact DevOps if you believe this is incorrect.",
    );
  }

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
            name: "mirrorbuddy-consent",
            value: JSON.stringify({
              version: "1.0",
              acceptedAt: new Date().toISOString(),
              essential: true,
              analytics: true,
              marketing: false,
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
