/**
 * GDPR Delete My Data API
 * Part of Ethical Design Hardening (F-03)
 *
 * Implements GDPR Article 17 - Right to Erasure
 * Allows users to request complete deletion of their personal data.
 */

import { NextResponse } from "next/server";
import { cookies as getCookies } from "next/headers";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { getRequestLogger, getRequestId } from "@/lib/tracing";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import {
  executeUserDataDeletion,
  getUserDataSummary,
  logDeletionAudit,
} from "./helpers";


export const revalidate = 0;
interface DeleteRequestBody {
  /** Confirmation that user understands deletion is irreversible */
  confirmDeletion: boolean;
  /** Optional reason for deletion (for analytics, not required) */
  reason?: string;
}

interface DeleteResult {
  success: boolean;
  deletedData: {
    conversations: number;
    messages: number;
    materials: number;
    progress: number;
    settings: number;
  };
  message: string;
}

/**
 * POST /api/privacy/delete-my-data
 *
 * Deletes all personal data for the authenticated user.
 * This is irreversible and complies with GDPR Art. 17.
 */
export const POST = pipe(
  withSentry("/api/privacy/delete-my-data"),
  withCSRF,
  withAuth,
)(async (ctx): Promise<Response> => {
  const log = getRequestLogger(ctx.req);
  const userId = ctx.userId!;

  const body = (await ctx.req.json()) as DeleteRequestBody;

  if (!body.confirmDeletion) {
    const response = NextResponse.json(
      { error: "Deletion must be explicitly confirmed" },
      { status: 400 },
    );
    response.headers.set("X-Request-ID", getRequestId(ctx.req));
    return response;
  }

  log.info("GDPR deletion request initiated", {
    userId: userId.slice(0, 8),
    reason: body.reason || "not provided",
  });

  // Execute deletion in transaction for atomicity
  const result = await executeUserDataDeletion(userId);

  // Log the deletion for audit (without PII)
  logDeletionAudit(userId, body.reason);

  // Clear the user cookie
  const cookieStore = await getCookies();
  cookieStore.delete(AUTH_COOKIE_NAME);

  log.info("GDPR deletion completed", {
    userId: userId.slice(0, 8),
    ...result.deletedData,
  });

  const response = NextResponse.json(result as DeleteResult);
  response.headers.set("X-Request-ID", getRequestId(ctx.req));
  return response;
});

/**
 * GET /api/privacy/delete-my-data
 *
 * Returns a summary of data that would be deleted.
 * Helps users understand what deletion will remove.
 */
export const GET = pipe(
  withSentry("/api/privacy/delete-my-data"),
  withAuth,
)(async (ctx): Promise<Response> => {
  const userId = ctx.userId!;

  const summary = await getUserDataSummary(userId);
  const response = NextResponse.json({
    userId: userId.slice(0, 8) + "...",
    dataToBeDeleted: summary,
    warning:
      "This action is irreversible. All your learning progress, conversations, and preferences will be permanently deleted.",
  });
  response.headers.set("X-Request-ID", getRequestId(ctx.req));
  return response;
});
