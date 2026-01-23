"use client";

/**
 * Client-side funnel tracking utilities
 * Plan 069 - Conversion Funnel Dashboard
 */

import { type FunnelStage } from "./constants";
import { getVisitorIdFromClient } from "@/lib/trial/visitor-id";
import { hasAnalyticsConsent } from "@/lib/consent/consent-storage";
import { csrfFetch } from "@/lib/auth/csrf-client";

export { type FunnelStage };

interface TrackFunnelParams {
  stage: FunnelStage;
  fromStage?: FunnelStage;
  metadata?: Record<string, unknown>;
}

/**
 * Track a funnel event from client
 * Respects analytics consent
 */
export async function trackFunnelEvent({
  stage,
  fromStage,
  metadata,
}: TrackFunnelParams): Promise<boolean> {
  // Check consent
  if (!hasAnalyticsConsent()) {
    return false;
  }

  // Get visitor ID
  const visitorId = getVisitorIdFromClient();
  if (!visitorId) {
    console.warn("[Funnel] No visitor ID, cannot track event");
    return false;
  }

  try {
    const response = await csrfFetch("/api/funnel/track", {
      method: "POST",
      body: JSON.stringify({
        stage,
        fromStage,
        metadata: {
          ...metadata,
          clientTimestamp: new Date().toISOString(),
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("[Funnel] Failed to track event:", error);
    return false;
  }
}

/**
 * Track visitor landing on welcome page
 */
export function trackWelcomeVisit(): Promise<boolean> {
  return trackFunnelEvent({
    stage: "VISITOR",
    metadata: {
      page: "welcome",
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
    },
  });
}

/**
 * Track trial start (click "Prova gratis")
 */
export function trackTrialStartClick(): Promise<boolean> {
  return trackFunnelEvent({
    stage: "TRIAL_START",
    fromStage: "VISITOR",
    metadata: {
      action: "prova_gratis_click",
      page: "welcome",
    },
  });
}

/**
 * Track login click from welcome page
 */
export function trackLoginClick(): Promise<boolean> {
  return trackFunnelEvent({
    stage: "VISITOR",
    metadata: {
      action: "login_click",
      page: "welcome",
      intent: "beta_access",
    },
  });
}
