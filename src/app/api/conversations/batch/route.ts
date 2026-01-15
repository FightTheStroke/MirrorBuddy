import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    // Delete messages first (due to foreign key constraints)
    await prisma.message.deleteMany({
      where: { conversationId: { in: ids } },
    });

    // Delete conversations
    const result = await prisma.conversation.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    logger.error('Failed to delete conversations', { error });
    return NextResponse.json({ error: 'Failed to delete conversations' }, { status: 500 });
  }
}
