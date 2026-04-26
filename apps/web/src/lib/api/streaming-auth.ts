import { NextResponse } from 'next/server';

export interface StreamingAuthResult {
  ok: boolean;
  userId?: string;
  response?: NextResponse;
}

export function streamingAuth(userId?: string | null): StreamingAuthResult {
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true, userId };
}
