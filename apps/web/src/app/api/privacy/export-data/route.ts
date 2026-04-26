/**
 * GDPR Data Portability API
 *
 * Implements GDPR Article 20 - Right to Data Portability
 * Allows users to download all their personal data in JSON format
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import { getRequestLogger, getRequestId } from "@/lib/tracing";
import {
  canUserExport,
  exportUserData,
  logExportAudit,
  getExportStats,
  type UserDataExport,
} from "./helpers";


export const revalidate = 0;
interface ExportResponse {
  data: UserDataExport;
  stats: {
    conversationCount: number;
    messageCount: number;
    flashcardCount: number;
    quizCount: number;
    sessionCount: number;
    learningCount: number;
  };
}

/**
 * GET /api/privacy/export-data
 *
 * Exports all user data in machine-readable JSON format.
 * Implements GDPR Article 20 - Right to Data Portability.
 *
 * Authentication: Required
 * Rate Limit: 1 export per hour per user
 * Response Format: JSON (downloadable)
 */
export const GET = pipe(
  withSentry("/api/privacy/export-data"),
  withAuth,
)(async (ctx): Promise<Response> => {
  const log = getRequestLogger(ctx.req);
  const requestId = getRequestId(ctx.req);
  const userId = ctx.userId!;

  // Check rate limit (1 export per hour)
  const canExport = await canUserExport(userId);
  if (!canExport) {
    log.warn("Export rate limit exceeded", {
      userId: userId.slice(0, 8),
    });
    const response = NextResponse.json(
      {
        error:
          "You can only export data once per hour. Please try again later.",
      },
      { status: 429 },
    );
    response.headers.set("X-Request-ID", requestId);
    return response;
  }

  log.info("Data export requested", {
    userId: userId.slice(0, 8),
  });

  // Export user data
  const exportData = await exportUserData(userId);

  // Get statistics
  const stats = await getExportStats(userId);

  // Log the export for audit trail
  await logExportAudit(userId);

  log.info("Data export completed successfully", {
    userId: userId.slice(0, 8),
    messageCount: stats.messageCount,
    conversationCount: stats.conversationCount,
  });

  // Create response with proper headers for download
  const response = NextResponse.json(
    {
      data: exportData,
      stats,
    } as ExportResponse,
    { status: 200 },
  );

  // Add headers for file download
  response.headers.set("X-Request-ID", requestId);
  response.headers.set(
    "Content-Disposition",
    `attachment; filename="mirrorbuddy-data-export-${new Date().toISOString().split("T")[0]}.json"`,
  );
  response.headers.set("Content-Type", "application/json; charset=utf-8");

  return response;
});

/**
 * OPTIONS /api/privacy/export-data
 *
 * CORS preflight response for data export
 */
export const OPTIONS = pipe(withSentry("/api/privacy/export-data"))(
  async (): Promise<Response> => {
    return NextResponse.json(
      {},
      {
        status: 200,
        headers: {
          Allow: "GET, OPTIONS",
          "Content-Type": "application/json",
        },
      },
    );
  },
);
