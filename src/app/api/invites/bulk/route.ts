/**
 * Bulk Invites API
 *
 * POST /api/invites/bulk
 * Body: { action: "approve" | "reject", requestIds: string[], reason?: string }
 *
 * Processes multiple invite requests in a single call.
 * Max batch size: 50 requests.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import {
  bulkApproveInvites,
  bulkRejectInvites,
} from "@/lib/invite/invite-service";
import { logger } from "@/lib/logger";

interface BulkRequestBody {
  action: "approve" | "reject";
  requestIds: string[];
  reason?: string;
}

export async function POST(request: NextRequest) {
  // CSRF protection
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  // Admin auth check
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: BulkRequestBody = await request.json();

    // Validation
    if (!body.action || !["approve", "reject"].includes(body.action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.requestIds) || body.requestIds.length === 0) {
      return NextResponse.json(
        { error: "requestIds must be a non-empty array" },
        { status: 400 },
      );
    }

    if (body.requestIds.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 requests per batch" },
        { status: 400 },
      );
    }

    // Process bulk operation
    const result =
      body.action === "approve"
        ? await bulkApproveInvites(body.requestIds, auth.userId)
        : await bulkRejectInvites(body.requestIds, auth.userId, body.reason);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Bulk invite operation failed", undefined, error);
    return NextResponse.json(
      { error: "Failed to process bulk operation" },
      { status: 500 },
    );
  }
}
