import { NextResponse } from 'next/server';
export * from './middlewares/index';

export function conversationOwnership(ownerId: string, requesterId: string) {
  return ownerId === requesterId;
}

export function withOwnership(ownerId: string, requesterId: string): NextResponse | null {
  if (!conversationOwnership(ownerId, requesterId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
