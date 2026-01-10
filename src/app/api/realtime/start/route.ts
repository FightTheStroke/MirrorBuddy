// src/app/api/realtime/start/route.ts
import { NextResponse } from 'next/server';
import { startRealtimeProxy } from '@/server/realtime-proxy';

export async function GET() {
  try {
    startRealtimeProxy();
    return NextResponse.json({ status: 'started' });
  } catch (error) {
    console.error('Failed to start realtime proxy:', error);
    return NextResponse.json({ error: 'Failed to start proxy' }, { status: 500 });
  }
}