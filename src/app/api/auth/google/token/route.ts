/**
 * Google OAuth Token API
 * ADR 0038 - Google Drive Integration
 *
 * Returns access token for Google Picker API.
 * Token is refreshed automatically if expired.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/google/oauth';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'userId is required' },
      { status: 400 }
    );
  }

  const accessToken = await getValidAccessToken(userId);

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Google Drive' },
      { status: 401 }
    );
  }

  return NextResponse.json({ accessToken });
}
