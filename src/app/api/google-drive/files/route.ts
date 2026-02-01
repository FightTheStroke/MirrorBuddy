/**
 * Google Drive Files List
 * GET /api/google-drive/files
 *
 * Lists files in Google Drive with optional folder navigation and search.
 *
 * Query params:
 * - userId: Required user ID
 * - folderId: Optional folder ID (default: root)
 * - search: Optional search query
 * - pageToken: Optional pagination token
 * - pageSize: Optional page size (default: 50)
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";
import {
  listDriveFiles,
  searchDriveFiles,
  getDriveFolderPath,
  toDriveFileUI,
} from "@/lib/google";

export const GET = pipe(
  withSentry("/api/google-drive/files"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const folderId = searchParams.get("folderId") || "root";
  const search = searchParams.get("search");
  const pageToken = searchParams.get("pageToken") || undefined;
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

  // If search query provided, search across Drive
  // Otherwise, list files in folder
  const result = search
    ? await searchDriveFiles(userId, search, { pageSize, pageToken })
    : await listDriveFiles(userId, { folderId, pageSize, pageToken });

  if (!result) {
    return NextResponse.json(
      { error: "Failed to fetch files. Please reconnect Google Drive." },
      { status: 401 },
    );
  }

  // Get breadcrumbs for folder navigation (skip for search)
  const breadcrumbs = search ? [] : await getDriveFolderPath(userId, folderId);

  // Convert to UI format
  const files = result.files.map(toDriveFileUI);

  return NextResponse.json({
    files,
    breadcrumbs,
    nextPageToken: result.nextPageToken,
    hasMore: !!result.nextPageToken,
  });
});
