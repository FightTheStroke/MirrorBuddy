/**
 * Google Drive File Download
 * GET /api/google-drive/files/[id]/download
 *
 * Downloads a file from Google Drive.
 * Google Docs/Sheets are exported as PDF.
 *
 * Query params:
 * - userId: Required user ID
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import { downloadDriveFile } from "@/lib/google";

export const GET = pipe(
  withSentry("/api/google-drive/files/[id]/download"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const { id: fileId } = await ctx.params;

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  const result = await downloadDriveFile(userId, fileId);

  if (!result) {
    return NextResponse.json(
      { error: "Failed to download file. Please reconnect Google Drive." },
      { status: 401 },
    );
  }

  // Return file as response
  return new NextResponse(result.content, {
    status: 200,
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(result.fileName)}"`,
      "Content-Length": String(result.size),
    },
  });
});
