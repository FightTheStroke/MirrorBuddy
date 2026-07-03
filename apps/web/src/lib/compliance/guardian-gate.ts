/**
 * Guardian Gate (T1.6, D-11)
 *
 * Server-side minor-protection check for payment endpoints
 * (/api/checkout, /api/billing/portal). The client-side grown-up gate
 * (sessionStorage + arithmetic challenge) is explicitly NOT verifiable
 * parental consent, so payment routes must enforce this on the server.
 *
 * REUSES the established COPPA signal — `Profile.age` +
 * `CoppaConsent.consentGranted` via `checkCoppaStatus()` — the same source
 * of truth used by the chat COPPA block
 * (src/app/api/chat/auth-handler.ts `extractUserIdWithCoppaCheck`).
 *
 * Unknown-age convention (mirrored from `checkCoppaStatus`):
 * - Age unknown (no Profile or `age === null`) → FAIL-OPEN (allowed).
 *   `checkCoppaStatus` computes `requiresConsent = age !== null && age < 13`,
 *   so the chat COPPA block also allows unknown-age accounts.
 * - DB/internal error → FAIL-CLOSED (blocked). `checkCoppaStatus` returns
 *   `{ requiresConsent: true, consentGranted: false }` on error ("Fail safe:
 *   require consent on error").
 *
 * @module compliance/guardian-gate
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { recordComplianceEvent } from "@/lib/safety/server";
import { checkCoppaStatus } from "./coppa-service";

const log = logger.child({ module: "guardian-gate" });

/** Machine-readable error code returned to clients on refusal */
export const GUARDIAN_REQUIRED_CODE = "GUARDIAN_REQUIRED" as const;

/** Result of the guardian gate check */
export interface GuardianGateResult {
  /** True if the account may proceed (adult, unknown age, or consented minor) */
  allowed: boolean;
  /** Set when blocked */
  reason?: "guardian_consent_missing";
}

/**
 * Check that the account is NOT a minor lacking recorded parental/guardian
 * consent. Adults, unknown-age accounts, and consented minors pass.
 *
 * Logs the refusal to the compliance audit trail (no PII — truncated
 * userId in structured logs only, matching the chat auth-handler pattern).
 *
 * @param userId - Authenticated user ID
 * @param endpoint - Endpoint path for audit context (e.g. "/api/checkout")
 */
export async function assertNotUnconsentedMinor(
  userId: string,
  endpoint: string,
): Promise<GuardianGateResult> {
  const status = await checkCoppaStatus(userId);

  if (!status.requiresConsent || status.consentGranted) {
    return { allowed: true };
  }

  // Refusal: minor without recorded parental consent (or fail-closed error).
  // No PII: truncated userId only (same convention as chat auth-handler).
  log.warn("Guardian gate: payment endpoint blocked for unconsented minor", {
    userId: userId.slice(0, 8),
    endpoint,
    consentPending: status.consentPending,
  });

  recordComplianceEvent("guardrail_triggered", {
    severity: "high",
    ageGroup: "child",
    eventDetails: {
      ruleId: "guardian_consent_required",
      endpoint,
      consentPending: status.consentPending,
    },
    mitigationApplied: "account_restricted",
    outcome: "blocked",
    regulatoryContext: { coppa: true },
    auditNotes:
      "Payment endpoint access refused: minor account without verifiable parental consent",
  });

  return { allowed: false, reason: "guardian_consent_missing" };
}

/**
 * Standard 403 response for guardian-gate refusals.
 * Mirrors the chat route's COPPA_CONSENT_REQUIRED response shape.
 */
export function guardianRequiredResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Parental consent required",
      code: GUARDIAN_REQUIRED_CODE,
      message:
        "A parent or guardian must provide consent before purchases or billing changes can be made on this account.",
    },
    { status: 403 },
  );
}
