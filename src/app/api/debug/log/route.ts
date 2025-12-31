/**
 * Debug Log API - Receives client-side errors and writes to file
 *
 * POST /api/debug/log
 * Body: { level, message, context?, stack?, url? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { debugLog } from '@/lib/debug-logger';

export async function POST(request: NextRequest) {
  // Only in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug logging disabled in production' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const entry = {
      level: body.level || 'error',
      message: body.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      context: body.context,
      stack: body.stack,
      url: body.url,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    debugLog.clientError(entry);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}

/**
 * GET /api/debug/log - Read current log file
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug logging disabled in production' }, { status: 403 });
  }

  try {
    const { readFileSync, existsSync } = await import('fs');
    const { getLogFilePath } = await import('@/lib/debug-logger');

    const logPath = getLogFilePath();

    if (!existsSync(logPath)) {
      return new NextResponse('No debug log file yet. Errors will appear here once logged.', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const content = readFileSync(logPath, 'utf-8');
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read log' }, { status: 500 });
  }
}
