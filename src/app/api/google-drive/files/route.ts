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

import { NextRequest, NextResponse } from 'next/server';
import {
  listDriveFiles,
  searchDriveFiles,
  getDriveFolderPath,
  toDriveFileUI,
} from '@/lib/google';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const folderId = searchParams.get('folderId') || 'root';
  const search = searchParams.get('search');
  const pageToken = searchParams.get('pageToken') || undefined;
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  try {
    // If search query provided, search across Drive
    // Otherwise, list files in folder
    const result = search
      ? await searchDriveFiles(userId, search, { pageSize, pageToken })
      : await listDriveFiles(userId, { folderId, pageSize, pageToken });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to fetch files. Please reconnect Google Drive.' },
        { status: 401 }
      );
    }

    // Get breadcrumbs for folder navigation (skip for search)
    const breadcrumbs = search
      ? []
      : await getDriveFolderPath(userId, folderId);

    // Convert to UI format
    const files = result.files.map(toDriveFileUI);

    return NextResponse.json({
      files,
      breadcrumbs,
      nextPageToken: result.nextPageToken,
      hasMore: !!result.nextPageToken,
    });

  } catch (error) {
    logger.error('Google Drive files list failed', { error, userId, folderId, search });
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}
