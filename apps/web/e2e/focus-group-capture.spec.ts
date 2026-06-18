import { test } from './fixtures/base-fixtures';
import { mockOnboarding, mockHomePageAPIs, mockTracking } from './fixtures/api-mocks';
import {
  seedPersonaProfile,
  mockBaseTier,
  mockHealthyUsage,
  stubSpeechSynthesis,
  getSpokenTexts,
  gotoIntentHome,
} from './helpers/dsa-personas';
import type { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * SCRIBA — focus-group stimulus capture (NOT a test: no assertions, capture only).
 *
 * Implements §3.2 of MIRRORBUDDY-FOCUS-GROUP-SPEC.md: for each pilot persona it
 * drives the real intention-based home with the persona's DSA profile active and
 * records the artefacts a simulated participant is allowed to react to —
 * screenshots, accessibility tree, visible text + key attributes, focus traces
 * (keyboard personas) and TTS utterances. Output is the per-persona stimulus pack
 * under docs/focus-group/runs/<RUN_TAG>/stimulus/<personaId>/ plus a manifest.
 *
 * Gated behind FOCUS_GROUP=1 so it never runs in the normal E2E/CI sweep.
 * Run: FOCUS_GROUP=1 TEST_DATABASE_URL=... E2E_TESTS=1 npx playwright test \
 *   --config apps/web/playwright.config.ts --project=chromium \
 *   apps/web/e2e/focus-group-capture.spec.ts
 */

const RUN_TAG = process.env.FOCUS_GROUP_RUN_TAG ?? '2026-06-11-pilot3';
const RUN_ROOT = path.resolve(process.cwd(), 'docs/focus-group/runs', RUN_TAG, 'stimulus');

test.skip(!process.env.FOCUS_GROUP, 'capture-only spec — set FOCUS_GROUP=1 to run');
// One worker (shared dev server) but NOT serial: a failure in one persona
// capture must not skip the others.
test.describe.configure({ mode: 'default' });

// Force Italian (default locale, IT = source of truth): Playwright defaults to
// en-US, so without this next-intl negotiates English and Italian children would
// be reacting to an English UI — invalidating every lexical/comprehension finding.
test.use({ locale: 'it-IT', extraHTTPHeaders: { 'Accept-Language': 'it-IT,it;q=0.9' } });

// Same baseline mocks the persona specs use: completed onboarding (no /welcome
// redirect), healthy home APIs, silenced tracking. Without these the home never
// renders #intent-heading (real /api/user errors).
test.beforeEach(async ({ page, context }) => {
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'it', domain: 'localhost', path: '/' }]);
  // FGOP-10: hide the Next.js dev overlay (<nextjs-portal> + dev toasts/dialogs)
  // so captures stay clean even when accidentally run against `npm run dev`
  // instead of a production build. No-op on a production build (elements absent).
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.setAttribute('data-fgop10', 'hide-dev-overlay');
    style.textContent =
      'nextjs-portal,[data-nextjs-dialog-overlay],[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none !important;}';
    document.documentElement.appendChild(style);
  });
  await mockOnboarding(page);
  await mockHomePageAPIs(page);
  await mockTracking(page);
});

type StepRecord = {
  step: string;
  task: string;
  action: string;
  artefacts: string[];
};

function personaDir(personaId: string): string {
  const dir = path.join(RUN_ROOT, personaId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Extract visible text + accessibility-relevant attributes of every testid'd node. */
async function extractTextAndAttrs(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector('main')?.innerText ?? document.body.innerText;
    const nodes = Array.from(document.querySelectorAll('[data-testid]')).map((el) => ({
      testid: el.getAttribute('data-testid'),
      role: el.getAttribute('role'),
      tag: el.tagName.toLowerCase(),
      text: (el as HTMLElement).innerText?.slice(0, 200) ?? '',
      ariaLabel: el.getAttribute('aria-label'),
      ariaCurrent: el.getAttribute('aria-current'),
      ariaDescribedby: el.getAttribute('aria-describedby'),
      ariaDisabled: el.getAttribute('aria-disabled'),
      disabled: (el as HTMLButtonElement).disabled ?? null,
    }));
    return { visibleText: main, nodes };
  });
}

/** Walk Tab from the top and record every focus stop (keyboard personas). */
async function captureFocusTrace(page: Page, maxTabs = 40) {
  // Reset the sequential-focus START POINT to the top of the document. Just
  // blur()-ing leaves the browser's nav origin wherever focus last was, so Tab
  // resumes mid-page and the trace looks like the skip-link / header come AFTER
  // the content (a false "skip-link is late" alarm in pilot #1, FG-05). Focusing
  // a tabindex=-1 body makes the next Tab land on the first real focusable.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
  });
  const trace: Array<{ index: number; testid: string | null; name: string; tag: string }> = [];
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      return {
        testid: el.getAttribute('data-testid'),
        name: el.getAttribute('aria-label') || el.innerText?.slice(0, 60) || el.tagName,
        tag: el.tagName.toLowerCase(),
      };
    });
    if (stop) trace.push({ index: i + 1, ...stop });
    // Stop once focus cycles back to the first stop (wrapped around).
    if (trace.length > 2 && stop?.testid && stop.testid === trace[0].testid) break;
  }
  return trace;
}

async function captureStep(
  page: Page,
  dir: string,
  steps: StepRecord[],
  opts: {
    step: string;
    task: string;
    action: string;
    focusTrace?: boolean;
    tts?: boolean;
  },
) {
  const artefacts: string[] = [];

  await page.screenshot({ path: path.join(dir, `${opts.step}.png`), fullPage: true });
  artefacts.push(`${opts.step}.png`);

  const aria = await page.locator('body').ariaSnapshot();
  fs.writeFileSync(path.join(dir, `${opts.step}.aria.yaml`), aria);
  artefacts.push(`${opts.step}.aria.yaml`);

  const text = await extractTextAndAttrs(page);
  fs.writeFileSync(path.join(dir, `${opts.step}.text.json`), JSON.stringify(text, null, 2));
  artefacts.push(`${opts.step}.text.json`);

  if (opts.focusTrace) {
    const trace = await captureFocusTrace(page);
    fs.writeFileSync(path.join(dir, `${opts.step}.focus.json`), JSON.stringify(trace, null, 2));
    artefacts.push(`${opts.step}.focus.json`);
  }

  if (opts.tts) {
    const spoken = await getSpokenTexts(page);
    fs.writeFileSync(path.join(dir, `${opts.step}.tts.json`), JSON.stringify(spoken, null, 2));
    artefacts.push(`${opts.step}.tts.json`);
  }

  steps.push({ step: opts.step, task: opts.task, action: opts.action, artefacts });
}

function writeManifest(personaId: string, profile: string, tier: string, steps: StepRecord[]) {
  const dir = personaDir(personaId);
  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify(
      {
        personaId,
        profile,
        tier,
        runTag: RUN_TAG,
        branch: 'feat/ux-simplification-intention-based',
        capturedAt: new Date().toISOString(),
        steps,
      },
      null,
      2,
    ),
  );
}

// ── P1 Marco (dyslexia + ADHD), Trial — study/quizMe locked, TTS path ─────────
test('capture P1 Marco (dyslexia+adhd, Trial)', async ({ page, context }) => {
  const steps: StepRecord[] = [];
  const dir = personaDir('P1-marco');
  await stubSpeechSynthesis(page);
  await mockHealthyUsage(page);
  await seedPersonaProfile(page, context, ['dyslexia', 'adhd']); // Trial: no mockBaseTier
  await gotoIntentHome(page);

  await captureStep(page, dir, steps, {
    step: 's01',
    task: 'T2-landing',
    action: 'land on intent home (step 1)',
    tts: true,
  });

  // T6 — try a TTS speaker control on a card, if present.
  const speaker = page.locator('[data-testid^="tts-intent-"]').first();
  if (await speaker.count()) {
    await speaker.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(300);
    await captureStep(page, dir, steps, {
      step: 's02',
      task: 'T6-tts',
      action: 'activate first card TTS speaker',
      tts: true,
    });
  }

  // T2 — open homework → subject picker.
  await page.getByTestId('intent-card-homework').click();
  await page.locator('#intent-subject-heading').waitFor({ state: 'visible', timeout: 10000 });
  await captureStep(page, dir, steps, {
    step: 's03',
    task: 'T2/T8-subjects',
    action: 'open Compiti → subject picker',
  });

  // Back to step 1 to reach the locked card — wait for tier to settle so the
  // card is in its LOCKED state (aria-disabled, clickable), not loading (disabled).
  await gotoIntentHome(page);

  // T4 — locked "Mettiti alla prova" card → tier-lock dialog (class of A11Y-10).
  const quiz = page.getByTestId('intent-card-quizMe');
  if (await quiz.count()) {
    await quiz.dispatchEvent('click');
    await page
      .getByTestId('intent-locked-dialog')
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => {});
    await captureStep(page, dir, steps, {
      step: 's04',
      task: 'T4-tierlock',
      action: 'click locked "Mettiti alla prova" → tier-lock dialog',
    });
  }

  // T5 — dismiss any open T4 dialog, then navigate to "I miei premi".
  // The intent-locked-dialog opened by T4 intercepts clicks while visible;
  // Escape + wait-hidden ensures home-nav-progress receives the click (FGOP-13).
  await page.keyboard.press('Escape');
  await page
    .getByTestId('intent-locked-dialog')
    .waitFor({ state: 'hidden', timeout: 3000 })
    .catch(() => {});
  const premi = page.getByTestId('home-nav-progress');
  if (await premi.count()) {
    await premi.click({ timeout: 6000 }).catch(() => {});
    await page
      .getByTestId('progress-view')
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => {});
    await captureStep(page, dir, steps, {
      step: 's05',
      task: 'T5-premi',
      action: 'navigate to "I miei premi" (progress)',
    });
  }

  writeManifest('P1-marco', 'dyslexia+adhd', 'trial', steps);
});

// ── P3 Sofia (visual), Base — 640px reflow viewport (her real 200% zoom) ──────
test('capture P3 Sofia (visual, Base, 640px)', async ({ page, context }) => {
  const steps: StepRecord[] = [];
  const dir = personaDir('P3-sofia');
  await stubSpeechSynthesis(page);
  await mockHealthyUsage(page);
  await mockBaseTier(page);
  await seedPersonaProfile(page, context, ['visual']);
  await gotoIntentHome(page, 640); // §3.2: capture at her reflow width, not 1280

  await captureStep(page, dir, steps, {
    step: 's01',
    task: 'T2-landing',
    action: 'land on intent home at 640px (high-contrast + 130%)',
    tts: true,
  });

  await page.getByTestId('intent-card-homework').click();
  await page.locator('#intent-subject-heading').waitFor({ state: 'visible', timeout: 10000 });
  await captureStep(page, dir, steps, {
    step: 's02',
    task: 'T2/T8-subjects',
    action: 'open Compiti → subject picker (640px)',
  });

  const speaker = page.locator('[data-testid^="tts-intent-"]').first();
  if (await speaker.count()) {
    await speaker.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(300);
    await captureStep(page, dir, steps, {
      step: 's03',
      task: 'T6-tts',
      action: 'activate TTS speaker (640px)',
      tts: true,
    });
  }

  // Re-nav can hit a slow dev recompile; degrade gracefully so the manifest
  // and the critical 640px regression artefacts (s01/s02) are never lost.
  const reHome = await gotoIntentHome(page, 640).then(
    () => true,
    () => false,
  );
  const premi = page.getByTestId('home-nav-progress');
  if (reHome && (await premi.count())) {
    await premi.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(500);
    await captureStep(page, dir, steps, {
      step: 's04',
      task: 'T5-premi',
      action: 'navigate to "I miei premi" (640px)',
    });
  }

  writeManifest('P3-sofia', 'visual', 'base', steps);
});

// ── P4 Luca (motor), Base — keyboard-only, focus traces are the primary stimulus ─
test('capture P4 Luca (motor, Base, focus traces)', async ({ page, context }) => {
  const steps: StepRecord[] = [];
  const dir = personaDir('P4-luca');
  await mockHealthyUsage(page);
  await mockBaseTier(page);
  await seedPersonaProfile(page, context, ['motor']);
  await gotoIntentHome(page);

  await captureStep(page, dir, steps, {
    step: 's01',
    task: 'T2-landing',
    action: 'land on intent home (step 1) + full Tab focus trace',
    focusTrace: true,
  });

  // T2 — keyboard to homework, Enter → subject picker, capture focus trace there.
  await page.getByTestId('intent-card-homework').focus();
  await page.keyboard.press('Enter');
  await page.locator('#intent-subject-heading').waitFor({ state: 'visible', timeout: 10000 });
  await captureStep(page, dir, steps, {
    step: 's02',
    task: 'T2-subjects',
    action: 'keyboard-open Compiti → subject picker + focus trace',
    focusTrace: true,
  });

  await gotoIntentHome(page);
  const premi = page.getByTestId('home-nav-progress');
  if (await premi.count()) {
    await premi.focus().catch(() => {});
    await premi.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(500);
    await captureStep(page, dir, steps, {
      step: 's03',
      task: 'T5-premi',
      action: 'navigate to "I miei premi" + focus trace',
      focusTrace: true,
    });
  }

  writeManifest('P4-luca', 'motor', 'base', steps);
});

// ── P5 Giulia (autism), Trial — literal/predictability; quizMe/study LOCKED ────
test('capture P5 Giulia (autism, Trial)', async ({ page, context }) => {
  const steps: StepRecord[] = [];
  const dir = personaDir('P5-giulia');
  await stubSpeechSynthesis(page);
  await mockHealthyUsage(page);
  await seedPersonaProfile(page, context, ['autism']); // Trial: no mockBaseTier
  await gotoIntentHome(page);

  await captureStep(page, dir, steps, {
    step: 's01',
    task: 'T2-landing',
    action: 'land on intent home (step 1)',
  });

  // T2 — open homework → subject picker (context change she must anticipate).
  await page.getByTestId('intent-card-homework').click();
  await page.locator('#intent-subject-heading').waitFor({ state: 'visible', timeout: 10000 });
  await captureStep(page, dir, steps, {
    step: 's02',
    task: 'T2/T8-subjects',
    action: 'open Compiti → subject picker',
  });

  // T4 — locked "Mettiti alla prova" card → tier-lock dialog (the name may
  // unsettle her; the dialog is an unannounced context change).
  await gotoIntentHome(page);
  const quiz = page.getByTestId('intent-card-quizMe');
  if (await quiz.count()) {
    await quiz.dispatchEvent('click'); // aria-disabled → dispatchEvent, not click
    await page
      .getByTestId('intent-locked-dialog')
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => {});
    await captureStep(page, dir, steps, {
      step: 's03',
      task: 'T4-tierlock',
      action: 'click locked "Mettiti alla prova" → tier-lock dialog',
    });
  }

  // T5 — navigate to "I miei premi".
  await gotoIntentHome(page);
  const premi = page.getByTestId('home-nav-progress');
  if (await premi.count()) {
    await premi.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(500);
    await captureStep(page, dir, steps, {
      step: 's04',
      task: 'T5-premi',
      action: 'navigate to "I miei premi" (progress)',
    });
  }

  writeManifest('P5-giulia', 'autism', 'trial', steps);
});

// ── P6 Elena (auditory/sorda), Base — NO audio: TTS buttons must be ABSENT ─────
test('capture P6 Elena (auditory, Base)', async ({ page, context }) => {
  const steps: StepRecord[] = [];
  const dir = personaDir('P6-elena');
  // Stub speech synthesis so any (unexpected) utterance is recorded — for Elena
  // the EXPECTED capture is an empty tts.json and zero tts-intent buttons.
  await stubSpeechSynthesis(page);
  await mockHealthyUsage(page);
  await mockBaseTier(page);
  await seedPersonaProfile(page, context, ['auditory']); // ttsEnabled:false preset
  await gotoIntentHome(page);

  // T2 + T6-visual — landing: record presence/absence of speaker buttons.
  const ttsButtonsLanding = await page.locator('[data-testid^="tts-intent-"]').count();
  fs.writeFileSync(
    path.join(dir, 's01.tts-buttons.json'),
    JSON.stringify({ where: 'landing', ttsIntentButtonCount: ttsButtonsLanding }, null, 2),
  );
  await captureStep(page, dir, steps, {
    step: 's01',
    task: 'T2-landing/T6-visual',
    action: `land on intent home; tts-intent button count = ${ttsButtonsLanding} (expected 0)`,
    tts: true,
  });

  // T2 — open homework → subject picker; check for speaker buttons there too.
  await page.getByTestId('intent-card-homework').click();
  await page.locator('#intent-subject-heading').waitFor({ state: 'visible', timeout: 10000 });
  const ttsButtonsPicker = await page.locator('[data-testid^="tts-intent-"]').count();
  fs.writeFileSync(
    path.join(dir, 's02.tts-buttons.json'),
    JSON.stringify({ where: 'subject-picker', ttsIntentButtonCount: ttsButtonsPicker }, null, 2),
  );
  await captureStep(page, dir, steps, {
    step: 's02',
    task: 'T2/T8-subjects',
    action: `open Compiti → subject picker; tts-intent button count = ${ttsButtonsPicker}`,
    tts: true,
  });

  // T5 — navigate to "I miei premi".
  await gotoIntentHome(page);
  const premi = page.getByTestId('home-nav-progress');
  if (await premi.count()) {
    await premi.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(500);
    await captureStep(page, dir, steps, {
      step: 's03',
      task: 'T5-premi',
      action: 'navigate to "I miei premi" (progress)',
      tts: true,
    });
  }

  writeManifest('P6-elena', 'auditory', 'base', steps);
});

// ── P7 Davide (cerebral), Base — keyboard + reduced motion + large text + TTS ──
test('capture P7 Davide (cerebral, Base, focus traces + TTS)', async ({ page, context }) => {
  const steps: StepRecord[] = [];
  const dir = personaDir('P7-davide');
  await stubSpeechSynthesis(page);
  await mockHealthyUsage(page);
  await mockBaseTier(page);
  await seedPersonaProfile(page, context, ['cerebral']);
  await gotoIntentHome(page);

  await captureStep(page, dir, steps, {
    step: 's01',
    task: 'T2-landing',
    action: 'land on intent home + full Tab focus trace (cost of each stop)',
    focusTrace: true,
    tts: true,
  });

  // T2 — keyboard to homework, Enter → subject picker + focus trace.
  await page.getByTestId('intent-card-homework').focus();
  await page.keyboard.press('Enter');
  await page.locator('#intent-subject-heading').waitFor({ state: 'visible', timeout: 10000 });
  await captureStep(page, dir, steps, {
    step: 's02',
    task: 'T2-subjects',
    action: 'keyboard-open Compiti → subject picker + focus trace',
    focusTrace: true,
  });

  // T6 — TTS speaker on the subject picker (TTS = energy saving for him).
  const speaker = page.locator('[data-testid^="tts-intent-"]').first();
  if (await speaker.count()) {
    await speaker.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(300);
    await captureStep(page, dir, steps, {
      step: 's03',
      task: 'T6-tts',
      action: 'activate TTS speaker',
      tts: true,
    });
  }

  // T5 — navigate to "I miei premi" + focus trace.
  await gotoIntentHome(page);
  const premi = page.getByTestId('home-nav-progress');
  if (await premi.count()) {
    await premi.focus().catch(() => {});
    await premi.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(500);
    await captureStep(page, dir, steps, {
      step: 's04',
      task: 'T5-premi',
      action: 'navigate to "I miei premi" + focus trace',
      focusTrace: true,
    });
  }

  writeManifest('P7-davide', 'cerebral', 'base', steps);
});
