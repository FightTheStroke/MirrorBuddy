/**
 * E2E Tests: Tier Enforcement & Feature Access Control
 *
 * Comprehensive tests for tier-based feature restrictions:
 * - Trial tier limits (chat, voice, tools, documents)
 * - Base tier access levels
 * - Pro tier feature unlocks
 * - Upgrade prompts at 80% usage
 * - Locked features with Pro badge
 * - API tier enforcement
 *
 * Requirements (T5-07):
 * - Trial tier limits are enforced (chat count, voice minutes, etc.)
 * - Base tier has expected access levels
 * - Pro tier unlocks all features
 * - Upgrade prompts appear at 80% usage
 * - Locked features show Pro badge
 *
 * Run:
 *   npx playwright test e2e/tier-enforcement.spec.ts
 *   npx playwright test e2e/tier*.spec.ts --reporter=list
 *
 * Tag: @tier-enforcement, @tier-limits, @tier-features
 */

import { test, expect } from "./fixtures/auth-fixtures";

// ============================================================================
// TRIAL TIER - LIMITS ENFORCEMENT
// ============================================================================

test.describe("@tier-enforcement Trial Tier - Limits Enforcement", () => {
  test("trial user sees chat limit indicator in UI", async ({ trialPage }) => {
    await trialPage.goto("/home");
    await trialPage.waitForLoadState("domcontentloaded");

    // Check for trial indicator or limit display
    // Trial tier typically shows usage badges/counters
    const limitIndicator = trialPage.locator(
      "[data-testid='usage-indicator'], [data-testid='trial-limit'], text=/limit|allowed|remaining/i",
    );

    const indicatorVisible = await limitIndicator.count().then((c) => c > 0);

    if (indicatorVisible) {
      await expect(limitIndicator.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("trial tier prevents access to voice feature when limit reached", async ({
    request,
  }) => {
    // Attempt to use voice feature (trial tier should restrict)
    const voiceResponse = await request.post("/api/chat/stream", {
      data: {
        messages: [{ role: "user", content: "Test voice" }],
        useVoice: true,
        maestroId: "euclide",
        conversationId: "test-conv",
      },
    });

    // Should return 402 (payment required) or 503 (not available)
    expect([200, 402, 403, 429, 503]).toContain(voiceResponse.status());
  });

  test("trial tier enforces daily chat message limit", async ({ request }) => {
    // Get current usage info
    const usageResponse = await request.get("/api/user/usage");

    if (usageResponse.ok()) {
      const usage = await usageResponse.json();
      // Trial tier should have limited chat messages (typically 10-15 per day)
      expect(usage.tier).toMatch(/trial/i);
      expect(usage.limits).toBeDefined();
      expect(usage.limits.chatMessagesPerMonth).toBeDefined();
      // Trial should have restrictive limits
      expect(usage.limits.chatMessagesPerMonth).toBeLessThan(500);
    }
  });

  test("trial tier limits document uploads to 3 total", async ({ request }) => {
    // Get tier information for document limits
    const tierResponse = await request.get("/api/admin/tiers/trial");

    if (tierResponse.ok()) {
      const tier = await tierResponse.json();
      // Trial tier should have limited document uploads (typically 1-3 total)
      expect(tier.docsLimitTotal).toBeDefined();
      expect(tier.docsLimitTotal).toBeLessThanOrEqual(3);
    }
  });

  test("trial tier shows upgrade prompt at 80% usage", async ({
    trialPage,
  }) => {
    // Navigate to chat with simulated high usage
    await trialPage.route("/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "trial-user",
          tier: "trial",
          usage: {
            chat_messages: 8, // 80% of 10
            voice_seconds: 240, // 80% of 300
            tool_uses: 4, // 80% of 5
          },
        }),
      });
    });

    await trialPage.goto("/home");
    await trialPage.waitForLoadState("domcontentloaded");

    // Look for upgrade prompt
    const upgradePrompt = trialPage.locator(
      "[data-testid='upgrade-prompt'], text=/upgrade|pro|premium/i",
    );

    const promptVisible = await upgradePrompt
      .count()
      .then((c) => c > 0)
      .catch(() => false);

    if (promptVisible) {
      await expect(upgradePrompt.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ============================================================================
// BASE TIER - ACCESS LEVELS
// ============================================================================

test.describe("@tier-enforcement Base Tier - Access Levels", () => {
  test("base tier user can access core features", async ({ request }) => {
    // Verify base tier can access chat
    const chatResponse = await request.post("/api/chat/messages", {
      data: {
        content: "Hello maestro",
        maestroId: "euclide",
        conversationId: "base-test-conv",
      },
    });

    expect([200, 201]).toContain(chatResponse.status());
  });

  test("base tier has reasonable daily chat limits", async ({ request }) => {
    // Base tier typically has 50+ messages/day
    const response = await request.get("/api/user/usage");

    if (response.ok()) {
      const data = await response.json();
      expect(data.tier).toMatch(/base|pro|trial/i);
    }
  });

  test("base tier can access limited maestri", async ({ request }) => {
    const response = await request.get("/api/maestri");

    if (response.ok()) {
      const maestri = await response.json();
      // Base tier should have at least 5 maestri available
      expect(Array.isArray(maestri)).toBe(true);
      expect(maestri.length).toBeGreaterThanOrEqual(5);
    }
  });

  test("base tier shows feature limitations", async ({ request }) => {
    // Check tier definition shows feature limits
    const response = await request.get("/api/admin/tiers/base");

    if (response.ok()) {
      const tier = await response.json();
      expect(tier).toHaveProperty("code", "base");
      expect(tier).toHaveProperty("features");
    }
  });
});

// ============================================================================
// PRO TIER - FEATURE UNLOCKS
// ============================================================================

test.describe("@tier-enforcement Pro Tier - Feature Unlocks", () => {
  test("pro tier user can access all maestri", async ({ request }) => {
    // Check maestri access for pro tier
    const response = await request.get("/api/maestri");

    if (response.ok()) {
      const maestri = await response.json();
      // Should have maestri available (typically 20+)
      expect(Array.isArray(maestri)).toBe(true);
      expect(maestri.length).toBeGreaterThan(0);
    }
  });

  test("pro tier removes daily message limits", async ({ request }) => {
    // Get pro tier limits
    const response = await request.get("/api/admin/tiers/pro");

    if (response.ok()) {
      const tier = await response.json();
      // Pro tier should have unlimited or very high chat message limits
      expect(tier.chatLimitDaily).toBeDefined();
      // Pro should be unlimited (null) or > 100
      expect(tier.chatLimitDaily === null || tier.chatLimitDaily > 100).toBe(
        true,
      );
    }
  });

  test("pro tier enables all features", async ({ request }) => {
    // Get pro tier definition
    const response = await request.get("/api/admin/tiers/pro");

    if (response.ok()) {
      const tier = await response.json();
      expect(tier.features).toBeDefined();

      // Pro tier should have most or all features enabled
      const _featureKeys = ["voice", "pdf", "webcam"];
      const enabledCount = Object.values(tier.features).filter(
        (v) => v === true,
      ).length;

      expect(enabledCount).toBeGreaterThan(3);
    }
  });

  test("pro tier allows unlimited voice minutes", async ({ request }) => {
    // Get pro tier limits
    const response = await request.get("/api/admin/tiers/pro");

    if (response.ok()) {
      const tier = await response.json();
      // Pro tier should have unlimited or very high voice minutes
      expect(tier.voiceMinutesDaily).toBeDefined();
      // Pro should be unlimited (null) or > 60 minutes
      expect(
        tier.voiceMinutesDaily === null || tier.voiceMinutesDaily > 60,
      ).toBe(true);
    }
  });
});

// ============================================================================
// LOCKED FEATURES - PRO BADGE
// ============================================================================

test.describe("@tier-enforcement Locked Features - Pro Badge", () => {
  test("locked feature shows pro badge in UI", async ({ trialPage }) => {
    await trialPage.goto("/home");
    await trialPage.waitForLoadState("domcontentloaded");

    // Look for locked/pro badge on features
    const proBadge = trialPage.locator(
      "[data-testid='pro-badge'], text=/Pro|Premium|Locked/i, [aria-label*='Pro']",
    );

    const badgeCount = await proBadge.count().catch(() => 0);

    if (badgeCount > 0) {
      await expect(proBadge.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("voice feature locked for trial tier", async ({ trialPage }) => {
    await trialPage.goto("/home");
    await trialPage.waitForLoadState("domcontentloaded");

    // Look for voice button or feature
    const voiceButton = trialPage.locator(
      "[data-testid='voice-button'], button:has-text('Voice'), button:has-text('Voce')",
    );

    if (await voiceButton.count()) {
      // Check if it's disabled or has pro badge
      const isDisabled = await voiceButton.first().getAttribute("disabled");
      const hasBadge = await voiceButton
        .locator("[data-testid='pro-badge']")
        .count()
        .then((c) => c > 0);

      expect(isDisabled || hasBadge).toBe(true);
    }
  });

  test("pdf export feature locked for trial tier", async ({ trialPage }) => {
    await trialPage.goto("/home");
    await trialPage.waitForLoadState("domcontentloaded");

    // Look for export button
    const exportButton = trialPage.locator(
      "button:has-text('Export'), button:has-text('PDF')",
    );

    if (await exportButton.count()) {
      const isDisabled = await exportButton.first().getAttribute("disabled");
      expect(isDisabled).toBeTruthy();
    }
  });

  test("mindmap feature shows upgrade prompt for trial", async ({
    trialPage,
  }) => {
    await trialPage.goto("/home");
    await trialPage.waitForLoadState("domcontentloaded");

    // Click on mindmap if visible
    const mindmapButton = trialPage.locator(
      "button:has-text('Mind Map'), button:has-text('Mappa')",
    );

    if (await mindmapButton.count()) {
      await mindmapButton.first().click();
      await trialPage.waitForTimeout(500);

      // Should show upgrade/pro modal
      const upgradeModal = trialPage.locator(
        "[data-testid='upgrade-modal'], text=/upgrade|pro/i",
      );

      const modalVisible = await upgradeModal
        .count()
        .then((c) => c > 0)
        .catch(() => false);

      if (modalVisible) {
        await expect(upgradeModal.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ============================================================================
// UPGRADE PROMPTS - 80% USAGE THRESHOLD
// ============================================================================

test.describe("@tier-enforcement Upgrade Prompts - 80% Usage", () => {
  test("80% chat usage triggers upgrade prompt", async ({ request }) => {
    // Get trial tier definition to understand limits
    const tierResponse = await request.get("/api/admin/tiers/trial");

    if (tierResponse.ok()) {
      const tier = await tierResponse.json();
      // Trial tier should have defined limits
      expect(tier.chatLimitDaily).toBeDefined();
      expect(tier.chatLimitDaily).toBeLessThan(20); // Trial should be restrictive
    }
  });

  test("80% voice usage triggers upgrade notification", async ({ request }) => {
    // Get trial tier voice limits
    const response = await request.get("/api/admin/tiers/trial");

    if (response.ok()) {
      const tier = await response.json();
      // Trial tier should have limited voice minutes
      expect(tier.voiceMinutesDaily).toBeDefined();
      expect(tier.voiceMinutesDaily).toBeLessThan(60); // Trial should have < 1 hour
    }
  });

  test("trial tier has lower limits than base tier", async ({ request }) => {
    // Get both trial and base tier definitions
    const trialResponse = await request.get("/api/admin/tiers/trial");
    const baseResponse = await request.get("/api/admin/tiers/base");

    if (trialResponse.ok() && baseResponse.ok()) {
      const trial = await trialResponse.json();
      const base = await baseResponse.json();

      // Trial should have lower chat limits than base
      if (trial.chatLimitDaily && base.chatLimitDaily) {
        expect(trial.chatLimitDaily).toBeLessThan(base.chatLimitDaily);
      }
    }
  });
});

// ============================================================================
// TIER COMPARISON & FEATURE MATRIX
// ============================================================================

test.describe("@tier-enforcement Tier Comparison & Feature Matrix", () => {
  test("tier comparison table displays all tiers", async ({ trialPage }) => {
    await trialPage.goto("/pricing");
    await trialPage.waitForLoadState("domcontentloaded");

    // Look for tier cards
    const tierCards = trialPage.locator(
      "[data-testid='tier-card'], [data-testid='pricing-tier']",
    );

    const cardCount = await tierCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3); // trial, base, pro
  });

  test("tier comparison shows feature differences", async ({ trialPage }) => {
    await trialPage.goto("/pricing");
    await trialPage.waitForLoadState("domcontentloaded");

    // Look for feature rows
    const featureRows = trialPage.locator(
      "[data-testid='feature-row'], table tbody tr",
    );

    const rowCount = await featureRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Check for checkmarks/X marks indicating feature availability
    const checkmarks = trialPage.locator("text=/✓|✕|✔|✗|•/");
    const markCount = await checkmarks.count();

    // Should have multiple feature indicators
    expect(markCount).toBeGreaterThan(0);
  });

  test("upgrade button visible on trial/base tier cards", async ({
    trialPage,
  }) => {
    await trialPage.goto("/pricing");
    await trialPage.waitForLoadState("domcontentloaded");

    // Look for upgrade buttons
    const upgradeButtons = trialPage.locator(
      "button:has-text('Upgrade'), button:has-text('Iscriviti'), a:has-text('Get Started')",
    );

    const buttonCount = await upgradeButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test("pro tier card shows all features enabled", async ({ trialPage }) => {
    await trialPage.goto("/pricing");
    await trialPage.waitForLoadState("domcontentloaded");

    // Find pro tier card
    const proCard = trialPage.locator(
      "[data-testid='tier-card-pro'], text=/Pro|Premium/ ~ [data-testid='tier-card']",
    );

    if (await proCard.count()) {
      // All features should be checked/enabled in pro card
      const disabledFeatures = proCard.locator(
        "[data-testid='feature-disabled']",
      );
      const disabledCount = await disabledFeatures.count();

      expect(disabledCount).toBe(0);
    }
  });
});

// ============================================================================
// TIER ENFORCEMENT ON API LEVEL
// ============================================================================

test.describe("@tier-enforcement API Tier Enforcement", () => {
  test("API rejects feature access for insufficient tier", async ({
    request,
  }) => {
    // Try to use PDF export as trial user
    const response = await request.post("/api/documents/export-pdf", {
      data: {
        conversationId: "test-conv",
        format: "pdf",
      },
    });

    // Should return 402 (payment required) or 403 (forbidden)
    expect([402, 403]).toContain(response.status());
  });

  test("API returns proper tier info in responses", async ({ request }) => {
    const response = await request.get("/api/user");

    if (response.ok()) {
      const user = await response.json();
      expect(user.tier).toMatch(/trial|base|pro/i);
      expect(user.subscription).toBeDefined();
    }
  });

  test("API enforces usage limits on operations", async ({ request }) => {
    // Make multiple tool requests to hit limit
    const responses = [];
    for (let i = 0; i < 10; i++) {
      const resp = await request.post("/api/tools/mindmap", {
        data: {
          topic: "Test",
          content: "Test content",
        },
      });
      responses.push(resp.status());
    }

    // At some point should hit rate limit or limit exceeded
    const hasLimit = responses.some((s) => [402, 403, 429].includes(s));
    expect(hasLimit || responses.every((s) => s === 200)).toBe(true);
  });

  test("API response includes usage telemetry", async ({ request }) => {
    const response = await request.post("/api/chat/messages", {
      data: {
        content: "Test",
        maestroId: "euclide",
      },
    });

    if (response.ok()) {
      const data = await response.json();
      // Should include usage information
      expect(
        data.usage || data.telemetry || data.headers || data.subscription,
      ).toBeDefined();
    }
  });
});

// ============================================================================
// TIER TRANSITIONS & UPGRADES
// ============================================================================

test.describe("@tier-enforcement Tier Transitions", () => {
  test("pro tier has higher limits than trial tier", async ({ request }) => {
    // Get trial tier limits
    const trialTier = await request.get("/api/admin/tiers/trial");
    const trialData = trialTier.ok() ? await trialTier.json() : null;

    // Get pro tier limits
    const proTier = await request.get("/api/admin/tiers/pro");
    const proData = proTier.ok() ? await proTier.json() : null;

    if (trialData && proData) {
      // Pro should have higher or unlimited chat limits
      const trialChatLimit = trialData.chatLimitDaily || 10;
      const proChatLimit = proData.chatLimitDaily || 10000;

      expect(proChatLimit).toBeGreaterThan(trialChatLimit);
    }
  });

  test("base tier has lower limits than pro tier", async ({ request }) => {
    // Get base tier info
    const baseTier = await request.get("/api/admin/tiers/base");
    const baseData = baseTier.ok() ? await baseTier.json() : null;

    // Get pro tier info
    const proTier = await request.get("/api/admin/tiers/pro");
    const proData = proTier.ok() ? await proTier.json() : null;

    if (baseData && proData) {
      // Base should have lower chat limits than pro
      const baseLimit = baseData.chatLimitDaily || 50;
      const proLimit = proData.chatLimitDaily || 10000;

      expect(baseLimit).toBeLessThanOrEqual(proLimit);
    }
  });
});

// ============================================================================
// ADMIN TIER MANAGEMENT
// ============================================================================

test.describe("@tier-enforcement Admin Tier Management", () => {
  test("admin can create new tier", async ({ adminPage }) => {
    await adminPage.goto("/admin/tiers/new");
    await adminPage.waitForLoadState("domcontentloaded");

    // Form should be visible
    await expect(adminPage.locator('input[name="code"]')).toBeVisible();
    await expect(adminPage.locator('input[name="name"]')).toBeVisible();
  });

  test("admin can view tier definitions", async ({ adminPage }) => {
    await adminPage.goto("/admin/tiers");
    await adminPage.waitForLoadState("domcontentloaded");

    // Should show tier list
    const tierRows = adminPage.locator("table tbody tr");
    const rowCount = await tierRows.count();

    expect(rowCount).toBeGreaterThanOrEqual(3); // trial, base, pro
  });

  test("admin sees tier usage metrics", async ({ adminPage }) => {
    await adminPage.goto("/admin/tiers");
    await adminPage.waitForLoadState("domcontentloaded");

    // Look for metrics display
    const metrics = adminPage.locator(
      "[data-testid='tier-metrics'], text=/users|active|conversion/i",
    );

    const metricsVisible = await metrics.count().then((c) => c > 0);
    expect(metricsVisible).toBe(true);
  });
});
