/**
 * Admin Test Helpers
 *
 * Shared utilities for admin E2E tests.
 * Used by: admin.spec.ts, admin-sidebar.spec.ts
 */

// Merged ignore patterns for admin tests
export const ADMIN_IGNORE_ERRORS = [
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /429.*Too Many Requests/i,
  /net::ERR_/i,
  /Failed to load resource/i,
  /hydrat/i,
  /WebSocket/i,
  /Content Security Policy/i,
  /\/api\/chat/i,
  /\/api\/voice/i,
  /realtime.*token/i,
];

// Admin routes for route audit
export const ADMIN_ROUTES = [
  "/admin",
  "/admin/analytics",
  "/admin/funnel",
  "/admin/invites",
  "/admin/tos",
  "/admin/users",
  "/change-password",
];

// Admin sidebar links for click-based navigation
// NOTE: /admin/settings doesn't exist yet - link in sidebar but page missing
export const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", exact: true },
  { label: "Funnel", href: "/admin/funnel", exact: false },
  { label: "Richieste Beta", href: "/admin/invites", exact: false },
  { label: "Utenti", href: "/admin/users", exact: false },
  { label: "Analytics", href: "/admin/analytics", exact: false },
  { label: "Termini Servizio", href: "/admin/tos", exact: false },
];

export interface AuditIssue {
  route: string;
  type: "navigation" | "console" | "network" | "button";
  severity: "error" | "warning";
  message: string;
}

export interface NavigationIssue {
  link: string;
  expected: string;
  actual: string;
  type: "404" | "redirect" | "error";
}

/**
 * Dismiss TOS/consent modals that may block interaction
 */
export async function dismissBlockingModals(
  page: import("@playwright/test").Page,
) {
  await page.route("/api/tos", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accepted: true, version: "1.0" }),
    });
  });

  await page.context().addInitScript(() => {
    localStorage.setItem(
      "mirrorbuddy-consent",
      JSON.stringify({
        version: "1.0",
        acceptedAt: new Date().toISOString(),
        essential: true,
        analytics: false,
        marketing: false,
      }),
    );
    sessionStorage.setItem("tos_accepted", "true");
    sessionStorage.setItem("tos_accepted_version", "1.0");
  });
}

/**
 * Close any open dialog (TOS, consent, etc.)
 */
export async function closeOpenDialogs(page: import("@playwright/test").Page) {
  const dialog = page.locator('[role="dialog"]');
  if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    const closeButton = dialog.locator(
      'button:has-text("Accett"), button:has-text("Chiudi"), button:has-text("Close"), button[aria-label*="close"]',
    );
    if (await closeButton.isVisible({ timeout: 500 }).catch(() => false)) {
      const checkbox = dialog.locator('input[type="checkbox"]');
      if (await checkbox.isVisible({ timeout: 500 }).catch(() => false)) {
        await checkbox.check({ force: true });
        await page.waitForTimeout(200);
      }
      await closeButton.click({ force: true });
      await page.waitForTimeout(500);
    }
  }
}
