/**
 * DSA persona helpers for the intention-based home E2E suites.
 *
 * HOW PROFILES ARE ACTIVATED IN TESTS (deliberate choice, documented per task):
 * - One spec exercises the REAL UI path (a11y floating button → quick panel →
 *   profile button), because that is what a child/parent actually does the
 *   first time.
 * - Every other persona test seeds the `mirrorbuddy-a11y` cookie with exactly
 *   the payload the store's `saveToCookie()` writes after a real activation
 *   (see src/lib/accessibility/accessibility-store.ts). This simulates the
 *   realistic "returning student" case: the profile was set up once (with a
 *   parent) and persists for 90 days, so it is already active on landing.
 *
 * IMPORTANT: E2E storage state authenticates a test user, so on startup
 * `initializeStores()` → `loadFromDatabase()` fetches /api/user/accessibility
 * and merges the response over the cookie-derived settings. base-fixtures
 * mock that endpoint with all-false settings, which would clobber a seeded
 * profile a moment after page load. `seedPersonaProfile` therefore ALSO
 * re-mocks the accessibility endpoints with the persona's settings (routes
 * registered later win), mirroring a real backend that persisted the profile.
 */

import type { Page, BrowserContext } from '@playwright/test';

export type DsaProfileId =
  | 'dyslexia'
  | 'adhd'
  | 'visual'
  | 'motor'
  | 'autism'
  | 'auditory'
  | 'cerebral';

type SettingsOverrides = Record<string, unknown>;

/**
 * Store defaults — mirror of
 * src/lib/accessibility/accessibility-store/defaults.ts. Keep in sync.
 */
const DEFAULT_SETTINGS: SettingsOverrides = {
  dyslexiaFont: false,
  extraLetterSpacing: false,
  increasedLineHeight: false,
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  ttsEnabled: false,
  ttsSpeed: 1.0,
  ttsAutoRead: false,
  adhdMode: false,
  distractionFreeMode: false,
  breakReminders: false,
  lineSpacing: 1.0,
  fontSize: 1.0,
  colorBlindMode: false,
  keyboardNavigation: true,
  adaptiveVadEnabled: true,
  voicePreference: null,
  customBackgroundColor: '#ffffff',
  customTextColor: '#000000',
};

/**
 * Profile presets — mirror of
 * src/lib/accessibility/accessibility-store/profiles.ts. Keep in sync.
 */
export const PROFILE_PRESETS: Record<DsaProfileId, SettingsOverrides> = {
  dyslexia: {
    dyslexiaFont: true,
    extraLetterSpacing: true,
    increasedLineHeight: true,
    lineSpacing: 1.5,
    fontSize: 1.1,
    voicePreference: 'alloy',
  },
  adhd: {
    adhdMode: true,
    distractionFreeMode: true,
    breakReminders: true,
    reducedMotion: true,
    voicePreference: 'echo',
  },
  visual: {
    highContrast: true,
    largeText: true,
    fontSize: 1.3,
    ttsEnabled: true,
    voicePreference: 'nova',
  },
  motor: {
    keyboardNavigation: true,
    reducedMotion: true,
    voicePreference: 'fable',
  },
  autism: {
    reducedMotion: true,
    distractionFreeMode: true,
    highContrast: false,
    lineSpacing: 1.4,
    fontSize: 1.1,
    voicePreference: 'onyx',
  },
  auditory: {
    ttsEnabled: false,
    largeText: true,
    lineSpacing: 1.3,
    voicePreference: 'shimmer',
  },
  cerebral: {
    keyboardNavigation: true,
    reducedMotion: true,
    ttsEnabled: true,
    largeText: true,
    fontSize: 1.2,
    lineSpacing: 1.4,
    extraLetterSpacing: true,
    voicePreference: 'ash',
  },
};

/**
 * Activate a DSA profile the way a RETURNING student has it: cookie persisted
 * by a prior real activation + the same settings persisted server-side.
 */
export async function seedPersonaProfile(
  page: Page,
  context: BrowserContext,
  profiles: DsaProfileId[],
  extra: SettingsOverrides = {},
): Promise<SettingsOverrides> {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...profiles.reduce((acc, p) => ({ ...acc, ...PROFILE_PRESETS[p] }), {}),
    ...extra,
  };
  const activeProfile = profiles[profiles.length - 1] ?? null;

  // Same shape as a11y-cookie-storage.ts writes (saveToCookie persists the
  // FULL settings object as overrides).
  await context.addCookies([
    {
      name: 'mirrorbuddy-a11y',
      value: encodeURIComponent(
        JSON.stringify({
          version: '1',
          activeProfile,
          overrides: settings,
          browserDetectedApplied: true,
        }),
      ),
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
    },
  ]);

  // Override base-fixtures' all-false accessibility mocks so the authenticated
  // store sync (loadFromDatabase) returns the SAME persona settings instead of
  // clobbering them. Later-registered routes win in Playwright.
  const dbShape = {
    id: 'e2e-dsa-settings',
    userId: 'e2e-dsa-user',
    ...settings,
    adhdConfig: {},
    adhdStats: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const fulfill = (route: Parameters<Parameters<Page['route']>[1]>[0]) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dbShape),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
  await page.route('**/api/user/accessibility', fulfill);
  await page.route('**/api/accessibility/settings', fulfill);

  return settings;
}

/**
 * Deterministic speech synthesis stub. Real TTS audio is irrelevant in E2E;
 * what matters is that the speaker control hands the RIGHT text to the speech
 * engine. Recorded utterances land in window.__spokenTexts.
 */
export async function stubSpeechSynthesis(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { __spokenTexts: string[] }).__spokenTexts = spoken;
    class FakeUtterance {
      text: string;
      rate = 1;
      lang = '';
      voice: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
      FakeUtterance;
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: (u: FakeUtterance) => spoken.push(u.text),
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [],
        speaking: false,
        pending: false,
        paused: false,
        addEventListener: () => {},
        removeEventListener: () => {},
        onvoiceschanged: null,
      },
    });
  });
}

/** Read back everything the stubbed speech engine was asked to say. */
export function getSpokenTexts(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __spokenTexts?: string[] }).__spokenTexts ?? [],
  );
}

/**
 * Healthy /api/user/usage so the trial usage dashboard renders its real UI
 * (not the DB-error fallback). Same shape as home-intent-a11y.spec.ts.
 */
export async function mockHealthyUsage(page: Page): Promise<void> {
  await page.route('**/api/user/usage', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        chat: { used: 2, limit: 10, percentage: 20 },
        voice: { used: 30, limit: 300, percentage: 10, unit: 's' },
        tools: { used: 1, limit: 10, percentage: 10 },
        docs: { used: 0, limit: 5, percentage: 0 },
      }),
    });
  });
}

/**
 * Simulate a registered (Base) student: study + quizMe intents unlocked.
 * Tier model: tiers gate intents via feature flags (.claude/rules/tier.md).
 */
export async function mockBaseTier(page: Page): Promise<void> {
  await page.route('**/api/user/tier-features', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tier: 'base',
        features: {
          chat: true,
          voice: true,
          flashcards: true,
          quizzes: true,
          mindMaps: true,
          tools: true,
        },
      }),
    });
  });
}

/** Land on the intent home and wait for the tier-settled, interactive state. */
export async function gotoIntentHome(page: Page, width = 1280): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await page.locator('#intent-heading').waitFor({ state: 'visible', timeout: 30000 });
  // Tier finished loading once the always-available card is natively enabled
  // (the chooser renders `disabled` only while useTierFeatures is loading).
  await page
    .locator('[data-testid="intent-card-homework"]:not([disabled])')
    .waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Keyboard-only navigation: press Tab until the element with the given
 * data-testid receives focus. Bounded so a broken Tab order fails loudly
 * instead of looping forever.
 */
export async function tabUntilFocused(page: Page, testId: string, maxTabs = 50): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const reached = await page.evaluate(
      (id) => document.activeElement?.getAttribute('data-testid') === id,
      testId,
    );
    if (reached) return;
  }
  throw new Error(`Tab order never reached [data-testid="${testId}"] within ${maxTabs} tabs`);
}
