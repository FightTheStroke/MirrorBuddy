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

import { NextRequest, NextResponse } from 'next/server';
import { downloadDriveFile } from '@/lib/google';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id: fileId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  if (!fileId) {
    return NextResponse.json(
      { error: 'fileId is required' },
      { status: 400 }
    );
  }

  try {
    const result = await downloadDriveFile(userId, fileId);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to download file. Please reconnect Google Drive.' },
        { status: 401 }
      );
    }

    // Return file as response
    return new NextResponse(result.content, {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName)}"`,
        'Content-Length': String(result.size),
      },
    });

  } catch (error) {
    logger.error('Google Drive download failed', { error, fileId, userId });
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
