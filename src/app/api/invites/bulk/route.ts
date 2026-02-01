/**
 * Bulk Invites API
 *
 * POST /api/invites/bulk
 * Body: { action: "approve" | "reject", requestIds: string[], reason?: string }
 *
 * Processes multiple invite requests in a single call.
 * Max batch size: 50 requests.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import {
  bulkApproveInvites,
  bulkRejectInvites,
} from "@/lib/invite/invite-service";

interface BulkRequestBody {
  action: "approve" | "reject";
  requestIds: string[];
  reason?: string;
}

export const POST = pipe(
  withSentry("/api/invites/bulk"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const userId = ctx.userId!;
  const body: BulkRequestBody = await ctx.req.json();

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
      ? await bulkApproveInvites(body.requestIds, userId)
      : await bulkRejectInvites(body.requestIds, userId, body.reason);

  return NextResponse.json(result);
});
