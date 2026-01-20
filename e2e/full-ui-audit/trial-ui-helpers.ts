/**
 * Helper functions for Trial Mode UI Audit
 */
import type { Page } from "@playwright/test";

export interface RouteError {
  route: string;
  type: "404" | "console_error" | "navigation_error" | "button_check_error";
  message: string;
  severity: "critical" | "warning";
}

/**
 * Public routes to test in trial mode
 * Excludes: admin/*, /api/chat/*, /api/voice/*
 */
export const PUBLIC_ROUTES = [
  "/",
  "/welcome",
  "/landing",
  "/astuccio",
  "/flashcard",
  "/homework",
  "/mindmap",
  "/quiz",
  "/study-kit",
  "/chart",
  "/diagram",
  "/formula",
  "/pdf",
  "/search",
  "/summary",
  "/timeline",
  "/webcam",
  "/archivio",
  "/supporti",
  "/demo",
  "/cookies",
  "/privacy",
  "/terms",
  "/invite/request",
] as const;

/**
 * Check that buttons on the page are clickable (F-04)
 * Does NOT click them, just verifies they're enabled and visible
 */
export async function checkButtonsClickable(
  page: Page,
  route: string,
  errors: RouteError[],
): Promise<void> {
  try {
    // Find all buttons and links
    const buttons = page.locator("button:visible, a:visible[href]");
    const count = await buttons.count();

    if (count === 0) {
      // Some pages may legitimately have no buttons (privacy policy, etc.)
      return;
    }

    // Check first few buttons are enabled (not disabled)
    const sampleSize = Math.min(count, 5);
    for (let i = 0; i < sampleSize; i++) {
      const button = buttons.nth(i);
      const isDisabled = await button.isDisabled().catch(() => false);
      const isVisible = await button.isVisible().catch(() => false);

      if (!isVisible || isDisabled) {
        errors.push({
          route,
          type: "button_check_error",
          message: `Button ${i + 1}/${count} is not clickable (disabled or hidden)`,
          severity: "warning",
        });
      }
    }
  } catch (error) {
    // Button check failure is not critical
    errors.push({
      route,
      type: "button_check_error",
      message: `Button check failed: ${error instanceof Error ? error.message : String(error)}`,
      severity: "warning",
    });
  }
}

/**
 * Generate human-readable report from errors (F-13)
 */
export function generateReport(errors: RouteError[]): string {
  if (errors.length === 0) {
    return "✅ All routes passed audit - zero errors detected";
  }

  const critical = errors.filter((e) => e.severity === "critical");
  const warnings = errors.filter((e) => e.severity === "warning");

  let report = "\n========== TRIAL MODE UI AUDIT REPORT ==========\n\n";

  if (critical.length > 0) {
    report += `🚨 CRITICAL ERRORS: ${critical.length}\n`;
    critical.forEach((e) => {
      report += `  - ${e.route}: [${e.type}] ${e.message}\n`;
    });
    report += "\n";
  }

  if (warnings.length > 0) {
    report += `⚠️  WARNINGS: ${warnings.length}\n`;
    warnings.forEach((e) => {
      report += `  - ${e.route}: [${e.type}] ${e.message}\n`;
    });
    report += "\n";
  }

  report += `TOTAL: ${errors.length} issue(s) detected\n`;
  report += "===============================================\n";

  return report;
}
