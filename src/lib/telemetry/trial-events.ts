/**
 * MIRRORBUDDY - Trial Mode Telemetry Events
 *
 * Track trial user funnel events for conversion analytics.
 * Events: trial_start, trial_chat, trial_limit_hit, feature_attempted,
 * beta_cta_shown, beta_cta_clicked
 *
 * Plan 052: Trial mode telemetry
 */

import { useTelemetryStore } from "./telemetry-store";
import { hasAnalyticsConsent } from "@/lib/consent/consent-storage";

/**
 * Session attributes for trial analytics
 */
export interface TrialSessionAttributes {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType: "mobile" | "tablet" | "desktop";
  browser: string;
  country?: string;
  city?: string;
}

/**
 * Get session attributes from URL and navigator
 */
export function getSessionAttributes(): TrialSessionAttributes {
  if (typeof window === "undefined") {
    return { deviceType: "desktop", browser: "unknown" };
  }

  const url = new URL(window.location.href);
  const ua = navigator.userAgent;

  // Detect device type
  let deviceType: "mobile" | "tablet" | "desktop" = "desktop";
  if (/Mobi|Android/i.test(ua)) {
    deviceType = /iPad|Tablet/i.test(ua) ? "tablet" : "mobile";
  }

  // Detect browser
  let browser = "unknown";
  if (ua.includes("Firefox")) browser = "firefox";
  else if (ua.includes("Chrome")) browser = "chrome";
  else if (ua.includes("Safari")) browser = "safari";
  else if (ua.includes("Edge")) browser = "edge";

  return {
    referrer: document.referrer || undefined,
    utmSource: url.searchParams.get("utm_source") || undefined,
    utmMedium: url.searchParams.get("utm_medium") || undefined,
    utmCampaign: url.searchParams.get("utm_campaign") || undefined,
    deviceType,
    browser,
  };
}

/**
 * Track trial session start
 */
export function trackTrialStart(visitorId: string): void {
  if (!hasAnalyticsConsent()) return;

  const attrs = getSessionAttributes();
  useTelemetryStore
    .getState()
    .trackEvent("navigation", "trial_start", visitorId, undefined, {
      deviceType: attrs.deviceType,
      browser: attrs.browser,
      referrer: attrs.referrer || "direct",
      utmSource: attrs.utmSource || "none",
      utmMedium: attrs.utmMedium || "none",
      utmCampaign: attrs.utmCampaign || "none",
    });
}

/**
 * Track trial chat message
 */
export function trackTrialChat(
  visitorId: string,
  chatNumber: number,
  remainingChats: number,
): void {
  if (!hasAnalyticsConsent()) return;

  useTelemetryStore
    .getState()
    .trackEvent("conversation", "trial_chat", visitorId, chatNumber, {
      remainingChats,
      progressPercent: Math.round((chatNumber / 10) * 100),
    });
}

/**
 * Track when trial limit is reached
 */
export function trackTrialLimitHit(
  visitorId: string,
  limitType: "chat" | "document" | "maestro" | "coach" | "tool" | "voice",
): void {
  if (!hasAnalyticsConsent()) return;

  useTelemetryStore
    .getState()
    .trackEvent("navigation", "trial_limit_hit", visitorId, undefined, {
      limitType,
    });
}

/**
 * Track trial voice session
 */
export function trackTrialVoice(
  visitorId: string,
  durationSeconds: number,
  remainingSeconds: number,
): void {
  if (!hasAnalyticsConsent()) return;

  useTelemetryStore
    .getState()
    .trackEvent("conversation", "trial_voice", visitorId, durationSeconds, {
      remainingSeconds,
      progressPercent: Math.round(((300 - remainingSeconds) / 300) * 100),
    });
}

/**
 * Track trial tool usage
 */
export function trackTrialTool(
  visitorId: string,
  toolName: string,
  toolsUsed: number,
  remainingTools: number,
): void {
  if (!hasAnalyticsConsent()) return;

  useTelemetryStore
    .getState()
    .trackEvent("conversation", "trial_tool", toolName, toolsUsed, {
      visitorId,
      remainingTools,
      progressPercent: Math.round((toolsUsed / 10) * 100),
    });
}

/**
 * Track when user attempts a blocked feature
 */
export function trackFeatureAttempted(
  visitorId: string,
  featureName: string,
  wasBlocked: boolean,
): void {
  if (!hasAnalyticsConsent()) return;

  useTelemetryStore
    .getState()
    .trackEvent("navigation", "feature_attempted", featureName, undefined, {
      visitorId,
      wasBlocked,
    });
}

/**
 * Track when beta CTA is shown to user
 */
export function trackBetaCtaShown(
  visitorId: string,
  location: "limit_modal" | "upgrade_prompt" | "sidebar" | "header",
): void {
  if (!hasAnalyticsConsent()) return;

  useTelemetryStore
    .getState()
    .trackEvent("navigation", "beta_cta_shown", location, undefined, {
      visitorId,
    });
}

/**
 * Track when user clicks beta request CTA
 */
export function trackBetaCtaClicked(
  visitorId: string,
  location: "limit_modal" | "upgrade_prompt" | "sidebar" | "header",
): void {
  if (!hasAnalyticsConsent()) return;

  useTelemetryStore
    .getState()
    .trackEvent("navigation", "beta_cta_clicked", location, undefined, {
      visitorId,
    });
}

/**
 * Track budget exhaustion event
 */
export function trackBudgetExhausted(
  reason: "global_cap" | "abuse_detected",
): void {
  if (!hasAnalyticsConsent()) return;

  useTelemetryStore
    .getState()
    .trackEvent("error", "budget_exhausted", reason, undefined, {});
}
