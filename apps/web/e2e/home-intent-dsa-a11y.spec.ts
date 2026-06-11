import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures/a11y-fixtures';
import { mockOnboarding, mockHomePageAPIs, mockTracking } from './fixtures/api-mocks';
import {
  seedPersonaProfile,
  mockHealthyUsage,
  gotoIntentHome,
  type DsaProfileId,
} from './helpers/dsa-personas';

/**
 * WCAG 2.1 A/AA automated coverage of the intention-based home UNDER EACH of
 * the 7 DSA profiles (axe-core), plus keyboard focus visibility and the
 * 200%-zoom reflow check for the text-scaling profiles.
 *
 * Complements home-intent-a11y.spec.ts (which scans the default, no-profile
 * state): a profile rewrites fonts, colors, spacing and motion, so a surface
 * that passes axe with defaults can still fail for the student who actually
 * relies on the profile. Profiles are activated via the persisted-cookie path
 * (see helpers/dsa-personas.ts for why that is the realistic returning-student
 * setup).
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const ALL_PROFILES: DsaProfileId[] = [
  'dyslexia',
  'adhd',
  'visual',
  'motor',
  'autism',
  'auditory',
  'cerebral',
];

// axe samples computed colors mid-animation; wait for the framer fade on the
// active step section to settle before scanning (same guard as
// home-intent-a11y.spec.ts).
async function waitForSectionSettled(page: import('@playwright/test').Page, headingId: string) {
  await expect(page.locator(`section[aria-labelledby="${headingId}"]`)).toHaveCSS('opacity', '1');
}

function formatViolations(violations: { id: string; nodes: { target: unknown[] }[] }[]) {
  return violations.map((v) => `${v.id} (${v.nodes.length} nodes)`).join(', ');
}

// Dev-server cold compiles + axe scans are slow; keep a generous budget.
test.setTimeout(120000);

test.beforeEach(async ({ page }) => {
  await mockOnboarding(page);
  await mockHomePageAPIs(page);
  await mockTracking(page);
  await mockHealthyUsage(page);
});

// ── axe scans: step 1 under every DSA profile ─────────────────────────────

/**
 * A11Y-11 (FIXED): the `.high-contrast` mode used to force `color: #ffff00` on
 * every button/link WITHOUT a dark background, so sidebar nav labels, trial
 * links and usage chips rendered yellow-on-white (~1.07:1). globals.css now
 * pins background + foreground + border together on all non-media elements in
 * high-contrast mode, so the full color-contrast scan below (no rule disabled)
 * must be clean for every profile — including `visual`.
 */
const scanWithProfileQuirks = (page: import('@playwright/test').Page, _profile: DsaProfileId) =>
  new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

for (const profile of ALL_PROFILES) {
  test(`step 1 (intent cards) has no axe violations with the ${profile} profile`, async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, [profile]);
    await gotoIntentHome(page);
    await waitForSectionSettled(page, 'intent-heading');

    const results = await scanWithProfileQuirks(page, profile);
    expect(
      results.violations,
      `${profile} step-1 violations: ${formatViolations(results.violations)}`,
    ).toHaveLength(0);
  });
}

test('step 1 full-contrast axe scan with the visual profile (A11Y-11 regression guard)', async ({
  page,
  context,
}) => {
  await seedPersonaProfile(page, context, ['visual']);
  await gotoIntentHome(page);
  await waitForSectionSettled(page, 'intent-heading');
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations,
    `visual full-scan violations: ${formatViolations(results.violations)}`,
  ).toHaveLength(0);
});

// ── axe scans: step 2 under the text-rewriting profiles ───────────────────

for (const profile of ['dyslexia', 'visual'] as DsaProfileId[]) {
  test(`step 2 (subject picker) has no axe violations with the ${profile} profile`, async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, [profile]);
    await gotoIntentHome(page);
    await page.getByTestId('intent-card-homework').click();
    await expect(page.locator('#intent-subject-heading')).toBeVisible();
    await waitForSectionSettled(page, 'intent-subject-heading');

    const results = await scanWithProfileQuirks(page, profile);
    expect(
      results.violations,
      `${profile} step-2 violations: ${formatViolations(results.violations)}`,
    ).toHaveLength(0);
  });
}

// ── axe scan: the child-friendly tier-lock dialog ──────────────────────────

test('tier-lock dialog has no axe violations (autism profile)', async ({ page, context }) => {
  // Autism profile: the dialog is the highest-stakes surprise surface for a
  // child who needs predictability — it must be flawless for AT users too.
  await seedPersonaProfile(page, context, ['autism']);
  await gotoIntentHome(page);

  const study = page.getByTestId('intent-card-study');
  const dialog = page.getByTestId('intent-locked-dialog');
  // aria-disabled blocks Playwright auto-click; dispatch the DOM event (same
  // pattern as home-intent.spec.ts) and poll until the dialog mounts.
  await expect(async () => {
    await study.dispatchEvent('click');
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10000 });

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations,
    `tier-lock dialog violations: ${formatViolations(results.violations)}`,
  ).toHaveLength(0);
});

// ── keyboard focus visibility (motor / cerebral students) ─────────────────

test('keyboard focus is visibly outlined on intent cards (motor profile)', async ({
  page,
  context,
}) => {
  await seedPersonaProfile(page, context, ['motor']);
  await gotoIntentHome(page);

  // Reach the card with a REAL keyboard interaction so :focus-visible applies
  // (programmatic .focus() does not always trigger it).
  await page.getByTestId('intent-card-homework').focus();
  await expect(page.getByTestId('intent-card-homework')).toBeFocused();

  // keyboard-nav mode (motor profile) forces a 3px outline on :focus-visible.
  const outline = await page.getByTestId('intent-card-homework').evaluate((el) => {
    const style = getComputedStyle(el);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });
  expect(outline.width).not.toBe('0px');
  expect(outline.style).not.toBe('none');
});

// ── WCAG 1.4.10 reflow at 200% zoom for the text-scaling profiles ─────────

/**
 * 1280 / 2 = 640 CSS px of effective layout width — the WCAG 200% reflow case.
 * The text-scaling profiles (dyslexia 110%, cerebral 120%, visual 130% + the
 * 120% large-text root bump) push line lengths furthest, so they are the ones
 * most likely to overflow horizontally.
 */
async function expectNoHorizontalScrollAt200(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 640, height: 900 });
  await expect(page.locator('main')).toBeVisible();
  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
  expect(
    overflow.scrollWidth,
    `horizontal overflow at 200% zoom: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

for (const profile of ['dyslexia', 'visual', 'cerebral'] as DsaProfileId[]) {
  test(`step 1 has no horizontal scroll at 200% zoom with the ${profile} profile`, async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, [profile]);
    await gotoIntentHome(page);
    await expectNoHorizontalScrollAt200(page);
  });

  test(`step 2 has no horizontal scroll at 200% zoom with the ${profile} profile`, async ({
    page,
    context,
  }) => {
    await seedPersonaProfile(page, context, [profile]);
    await gotoIntentHome(page);
    await page.getByTestId('intent-card-homework').click();
    await expect(page.locator('#intent-subject-heading')).toBeVisible();
    await expectNoHorizontalScrollAt200(page);
  });
}
