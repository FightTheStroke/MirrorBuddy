import { test, expect, openA11yPanel } from './fixtures/a11y-fixtures';
import { mockOnboarding, mockHomePageAPIs, mockTracking } from './fixtures/api-mocks';
import {
  seedPersonaProfile,
  stubSpeechSynthesis,
  getSpokenTexts,
  mockHealthyUsage,
  mockBaseTier,
  gotoIntentHome,
  tabUntilFocused,
} from './helpers/dsa-personas';

/**
 * Persona-driven journeys through the intention-based home, one realistic
 * student per DSA profile (WCAG 2.1 AA — 7 DSA profiles, ADR 0060):
 *
 *  - Marco, 9  — dyslexia + ADHD: reads slowly, gets distracted by promos;
 *                relies on the dyslexia font, distraction-free mode and TTS.
 *  - Sofia, 12 — low vision: high contrast + 130% text + screen reader names.
 *  - Luca, 11  — motor impairment: no mouse, keyboard only (Tab/Enter/Escape).
 *  - Giulia, 8 — autism: needs reduced motion and a predictable, calm UI.
 *  - Elena, 13 — Deaf: nothing may be conveyed by audio alone.
 *  - Davide, 10 — cerebral palsy: large hit targets + keyboard + reduced motion.
 *  - Trial vs Base — tier gating must stay child-friendly (no prices).
 *
 * Profile activation strategy (see helpers/dsa-personas.ts): Marco activates
 * his profile through the REAL quick-panel UI once; all other personas are
 * "returning students" whose profile is restored from the persisted a11y
 * cookie + server settings, exactly as the app does in production.
 *
 * Italian forced via a11y-fixtures; structural assertions use data-testid.
 */

// Dev-server compiles routes on first hit; persona journeys span several
// surfaces. Generous per-test budget keeps slow cold starts from flaking.
test.setTimeout(120000);

test.beforeEach(async ({ page }) => {
  await mockOnboarding(page);
  await mockHomePageAPIs(page);
  await mockTracking(page);
  await mockHealthyUsage(page);
});

const htmlClasses = (page: import('@playwright/test').Page) =>
  page.evaluate(() => Array.from(document.documentElement.classList));

test.describe('Marco, 9 — dyslexia + ADHD', () => {
  test('activates the dyslexia profile from the quick panel like a first-time child', async ({
    page,
  }) => {
    // Fresh student: no profile seeded — Marco (with mamma) opens the floating
    // accessibility button and taps the Dislessia profile. This is the REAL
    // activation path, not a shortcut.
    await gotoIntentHome(page);
    await openA11yPanel(page);

    await page.getByRole('button', { name: 'Attiva profilo Dislessia' }).click();

    // Effect in the DOM, not just a toggled flag: the dyslexia font family and
    // spacing/line-height classes land on <html>/<body>.
    await expect(page.locator('html')).toHaveClass(/dyslexia-font/);
    await expect(page.locator('html')).toHaveClass(/dyslexia-spacing/);
    await expect(page.locator('html')).toHaveClass(/dyslexia-line-height/);
    const fontFamily = await page.evaluate(() => document.body.style.fontFamily);
    expect(fontFamily).toContain('OpenDyslexic');

    // The activation persists (saveToCookie) so tomorrow it is still active.
    await expect
      .poll(async () => {
        const cookies = await page.context().cookies();
        const a11y = cookies.find((c) => c.name === 'mirrorbuddy-a11y');
        return a11y
          ? (JSON.parse(decodeURIComponent(a11y.value)) as { activeProfile: string | null })
              .activeProfile
          : null;
      })
      .toBe('dyslexia');
  });

  test('does homework with dyslexia font, distraction-free mode and TTS read-aloud', async ({
    page,
    context,
  }) => {
    await stubSpeechSynthesis(page);
    // Returning student: dyslexia + ADHD profiles already set up; his parent
    // also enabled TTS in full settings so cards can be read aloud.
    await seedPersonaProfile(page, context, ['dyslexia', 'adhd'], { ttsEnabled: true });
    await gotoIntentHome(page);

    // Dyslexia effects in the DOM.
    await expect(page.locator('html')).toHaveClass(/dyslexia-font/);
    // ADHD effects: distraction-free + reduced motion.
    await expect(page.locator('html')).toHaveClass(/distraction-free/);
    await expect(page.locator('html')).toHaveClass(/reduced-motion/);
    // A11Y-05: distraction-free hides the trial promo surfaces so the only
    // thing on screen is the learning flow.
    await expect(page.getByTestId('trial-usage-dashboard')).toHaveCount(0);

    // Marco can't decode the card text quickly — he taps the speaker first.
    const ttsHomework = page.getByTestId('tts-intent-homework');
    await expect(ttsHomework).toBeVisible();
    await ttsHomework.click();
    await expect
      .poll(async () => (await getSpokenTexts(page)).join(' | '))
      .toContain('Fare i compiti');

    // Now the journey: homework → subject picker.
    await page.getByTestId('intent-card-homework').click();
    await expect(page.locator('#intent-subject-heading')).toBeVisible();

    // He has the subject speaker too (recognition before reading, UX-02/04).
    await page.getByTestId('tts-subject-mathematics').click();
    await expect.poll(async () => (await getSpokenTexts(page)).join(' | ')).toContain('Matematica');

    // Picks maths → the chooser unmounts and the Maestro session mounts with
    // the child-first handoff banner (UX-01).
    await page.getByTestId('subject-mathematics').click();
    await expect(page.locator('#intent-subject-heading')).toHaveCount(0);
    await expect(page.getByTestId('maestro-session-handoff')).toBeVisible({ timeout: 30000 });
    // TTS stays available inside the session for the handoff text.
    await expect(page.getByTestId('maestro-session-handoff-tts')).toBeVisible();
  });

  test('visits "I miei lavori" and "I miei premi" and finds his way back home', async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, ['dyslexia', 'adhd'], { ttsEnabled: true });
    await gotoIntentHome(page);

    await page.getByTestId('home-nav-supporti').click();
    await expect(page.locator('#intent-heading')).toHaveCount(0);
    await expect(page.locator('main')).toBeVisible();

    await page.getByTestId('home-nav-progress').click();
    await expect(page.locator('#intent-heading')).toHaveCount(0);
    await expect(page.locator('main')).toBeVisible();

    // Back home: the intent chooser returns — no dead ends for a child.
    await page.getByTestId('home-nav-intent').click();
    await expect(page.locator('#intent-heading')).toBeVisible();
  });
});

test.describe('Sofia, 12 — low vision (visual profile)', () => {
  test('gets high contrast and 130% text, and every card has a screen-reader name', async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, ['visual']);
    await gotoIntentHome(page);

    // Profile effects in the DOM.
    await expect(page.locator('html')).toHaveClass(/high-contrast/);
    await expect(page.locator('html')).toHaveClass(/large-text/);
    const fontSize = await page.evaluate(() => document.body.style.fontSize);
    expect(fontSize).toBe('130%');

    // Accessible names her screen reader announces (not icon-only buttons).
    const homework = page.getByTestId('intent-card-homework');
    await expect(homework).toContainText('Fare i compiti');
    // The locked card explains WHY through aria-describedby (A11Y-03).
    const study = page.getByTestId('intent-card-study');
    const describedBy = await study.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toContainText('Chiedi a un grande');
    // The TTS speakers (visual profile enables TTS) carry explicit labels.
    await expect(page.getByTestId('tts-intent-homework')).toHaveAttribute('aria-label', /Ascolta/);
  });

  test('completes the homework journey into a session', async ({ page, context }) => {
    await seedPersonaProfile(page, context, ['visual']);
    await gotoIntentHome(page);

    await page.getByTestId('intent-card-homework').click();
    await expect(page.locator('#intent-subject-heading')).toBeVisible();
    await page.getByTestId('subject-history').click();

    await expect(page.locator('#intent-heading')).toHaveCount(0);
    const handoff = page.getByTestId('maestro-session-handoff');
    await expect(handoff).toBeVisible({ timeout: 30000 });
    // The handoff is a polite status region with her subject named in text.
    await expect(handoff).toHaveAttribute('role', 'status');
    await expect(handoff).toContainText('Storia');
  });
});

test.describe('Luca, 11 — motor impairment (keyboard only, no mouse)', () => {
  test('completes step1 → step2 → session using only the keyboard', async ({ page, context }) => {
    await seedPersonaProfile(page, context, ['motor']);
    await gotoIntentHome(page);

    // Tab from the top of the document to the homework card. Bounded walk:
    // if the Tab order ever traps or skips the card, this fails loudly.
    await tabUntilFocused(page, 'intent-card-homework');
    const homework = page.getByTestId('intent-card-homework');
    await expect(homework).toBeFocused();
    // The motor profile's keyboard-nav mode guarantees a VISIBLE focus ring.
    const outlineWidth = await homework.evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(outlineWidth).not.toBe('0px');

    await page.keyboard.press('Enter');

    // WCAG 3.2: focus moves to the step heading only on his own action.
    await expect(page.locator('#intent-subject-heading')).toBeFocused();

    // From the heading, Tab reaches the "Non lo so" option first — Luca takes
    // it (he just wants to show his homework). Enter opens the session.
    await tabUntilFocused(page, 'intent-subject-any', 5);
    await page.keyboard.press('Enter');

    await expect(page.locator('#intent-subject-heading')).toHaveCount(0);
    await expect(page.getByTestId('maestro-session-handoff')).toBeVisible({ timeout: 30000 });
  });

  test('reaches the locked card by keyboard, opens its explanation and Escape returns focus', async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, ['motor']);
    await gotoIntentHome(page);

    const study = page.getByTestId('intent-card-study');
    // aria-disabled (not native disabled) keeps the locked card in Tab order.
    await expect(study).toHaveAttribute('aria-disabled', 'true');
    await study.focus();
    await expect(study).toBeFocused();

    // Enter on the locked card opens the child-friendly explanation dialog.
    await page.keyboard.press('Enter');
    const dialog = page.getByTestId('intent-locked-dialog');
    await expect(dialog).toBeVisible();

    // Escape dismisses it and focus RETURNS to where he was (no focus loss).
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(study).toBeFocused();
  });
});

test.describe('Giulia, 8 — autism (reduced motion, predictable UI)', () => {
  test('animations are suppressed and no harsh contrast is forced', async ({ page, context }) => {
    await seedPersonaProfile(page, context, ['autism']);
    await gotoIntentHome(page);

    // Reduced motion + calm focus space; explicitly NOT high contrast
    // (sensory overload), see profiles.ts.
    await expect(page.locator('html')).toHaveClass(/reduced-motion/);
    await expect(page.locator('html')).toHaveClass(/distraction-free/);
    const classes = await htmlClasses(page);
    expect(classes).not.toContain('high-contrast');

    // The intent section settles at full opacity (MotionConfig honors the
    // store's reducedMotion — A11Y-01); no perpetual animation.
    await expect(page.locator('section[aria-labelledby="intent-heading"]')).toHaveCSS(
      'opacity',
      '1',
    );
  });

  test('the tier-lock dialog never yanks her somewhere else and Escape brings her back', async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, ['autism']);
    await gotoIntentHome(page);

    const study = page.getByTestId('intent-card-study');
    await expect(study).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled makes Playwright refuse auto-click; dispatch the DOM event
    // directly (same pattern as home-intent.spec.ts) and poll for the dialog.
    const dialog = page.getByTestId('intent-locked-dialog');
    await expect(async () => {
      await study.dispatchEvent('click');
      await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });

    // No unexpected context change: she is still on step 1, no session opened.
    await expect(page.locator('#intent-subject-heading')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    // Everything is exactly where she left it.
    await expect(page.locator('#intent-heading')).toBeVisible();
    await expect(study).toBeVisible();
  });

  test('navigation marks where she is (aria-current) and stays consistent', async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, ['autism']);
    await gotoIntentHome(page);

    await expect(page.getByTestId('home-nav-intent')).toHaveAttribute('aria-current', 'page');

    await page.getByTestId('home-nav-progress').click();
    await expect(page.getByTestId('home-nav-progress')).toHaveAttribute('aria-current', 'page');
    // The previous item lost the marker — exactly one "you are here".
    await expect(page.getByTestId('home-nav-intent')).not.toHaveAttribute('aria-current', 'page');
    // The same three child destinations are still there, in the same place.
    await expect(page.getByTestId('home-nav-intent')).toBeVisible();
    await expect(page.getByTestId('home-nav-supporti')).toBeVisible();
    await expect(page.getByTestId('home-nav-progress')).toBeVisible();
  });
});

test.describe('Elena, 13 — Deaf (auditory profile)', () => {
  test('nothing on the home is conveyed by audio alone', async ({ page, context }) => {
    await seedPersonaProfile(page, context, ['auditory']);
    await gotoIntentHome(page);

    // Visual emphasis instead of audio: large text on.
    await expect(page.locator('html')).toHaveClass(/large-text/);

    // The auditory profile disables TTS — and the UI must not show useless
    // speaker buttons, nor rely on them for any information.
    await expect(page.getByTestId('tts-intent-homework')).toHaveCount(0);

    // Everything important is visible TEXT: card titles, subtitles, and the
    // lock reason on gated cards.
    await expect(page.getByTestId('intent-card-homework')).toContainText('Fare i compiti');
    await expect(page.getByTestId('intent-card-study')).toContainText(
      'Chiedi a un grande di sbloccarlo',
    );
  });

  test('the session handoff is a text banner, not an announcement she would miss', async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, ['auditory']);
    await gotoIntentHome(page);

    await page.getByTestId('intent-card-homework').click();
    await expect(page.locator('#intent-subject-heading')).toBeVisible();
    await page.getByTestId('subject-english').click();

    const handoff = page.getByTestId('maestro-session-handoff');
    await expect(handoff).toBeVisible({ timeout: 30000 });
    // Visible text carries the full handoff message…
    await expect(handoff).toContainText('Inglese');
    // …and no audio-only control is offered to her (TTS disabled).
    await expect(page.getByTestId('maestro-session-handoff-tts')).toHaveCount(0);
  });
});

test.describe('Davide, 10 — cerebral palsy (motor + reduced motion, large targets)', () => {
  test('hit targets are generous and the whole flow works from the keyboard', async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, ['cerebral']);
    await gotoIntentHome(page);

    // Profile effects: reduced motion + large text + keyboard-nav focus rings.
    await expect(page.locator('html')).toHaveClass(/reduced-motion/);
    await expect(page.locator('html')).toHaveClass(/large-text/);
    await expect(page.locator('html')).toHaveClass(/keyboard-nav/);

    // Large hit areas (WCAG 2.5.5-ish, project minimum 44px): intent cards and
    // their TTS speakers (cerebral profile enables TTS).
    for (const id of ['intent-card-homework', 'tts-intent-homework']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, `${id} should be visible`).toBeTruthy();
      expect(box!.height, `${id} height >= 44px`).toBeGreaterThanOrEqual(44);
      expect(box!.width, `${id} width >= 44px`).toBeGreaterThanOrEqual(44);
    }

    // Keyboard path into a session — imprecise mouse use is not required.
    const homework = page.getByTestId('intent-card-homework');
    await homework.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#intent-subject-heading')).toBeFocused();

    // Subject buttons also meet the 44px minimum.
    const subjectBox = await page.getByTestId('subject-mathematics').boundingBox();
    expect(subjectBox!.height).toBeGreaterThanOrEqual(44);

    const subject = page.getByTestId('subject-mathematics');
    await subject.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('maestro-session-handoff')).toBeVisible({ timeout: 30000 });
  });
});

test.describe('Tier gating — Trial student vs Base student', () => {
  test('Trial: "Mettiti alla prova" is locked behind a child-friendly dialog (no prices)', async ({
    page,
  }) => {
    // Default mocks = trial tier: quizzes/mindMaps off (.claude/rules/tier.md).
    await gotoIntentHome(page);

    const quiz = page.getByTestId('intent-card-quizMe');
    await expect(quiz).toHaveAttribute('aria-disabled', 'true');

    const dialog = page.getByTestId('intent-locked-dialog');
    await expect(async () => {
      await quiz.dispatchEvent('click');
      await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10000 });

    // Child-first copy: "ask a grown-up", never money or upgrade CTAs.
    await expect(dialog).toContainText('Chiedi a un grande');
    await expect(dialog).not.toContainText('9.99');
    await expect(dialog).not.toContainText('Pro');

    await page.getByTestId('intent-locked-dialog-close').click();
    await expect(dialog).toHaveCount(0);
  });

  test('Base: study and quizMe are unlocked and study opens its subject picker', async ({
    page,
  }) => {
    await mockBaseTier(page);
    await gotoIntentHome(page);

    const study = page.getByTestId('intent-card-study');
    const quiz = page.getByTestId('intent-card-quizMe');
    await expect(study).toHaveAttribute('aria-disabled', 'false');
    await expect(quiz).toHaveAttribute('aria-disabled', 'false');
    // Unlocked cards carry no lock hint.
    await expect(page.locator('#intent-locked-hint-study')).toHaveCount(0);

    // The study intent goes straight to its subject step…
    await study.click();
    await expect(page.locator('#intent-subject-heading')).toBeVisible();
    // …without the homework-only "Non lo so" shortcut.
    await expect(page.getByTestId('intent-subject-any')).toHaveCount(0);

    await page.getByTestId('subject-geography').click();
    // Study sessions open with the mindmap tool pre-requested: the session
    // seeds a contextual assistant greeting (use-maestro-session-logic.ts), so
    // messages.length > 0 and the handoff banner intentionally does NOT render.
    // The greeting itself is the "session mounted" signal here.
    await expect(page.locator('#intent-heading')).toHaveCount(0);
    await expect(page.getByText('Vedo che vuoi creare una mappa mentale')).toBeVisible({
      timeout: 30000,
    });
  });
});
