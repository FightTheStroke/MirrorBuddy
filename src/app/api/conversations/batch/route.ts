import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * DELETE /api/conversations/batch
 * Bulk delete conversations by IDs
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array is required' },
        { status: 400 }
      );
    }

    // Verify all conversations belong to user
    const conversations = await prisma.conversation.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: { id: true },
    });

    const ownedIds = conversations.map((c: { id: string }) => c.id);

    if (ownedIds.length !== ids.length) {
      return NextResponse.json(
        { error: 'Some conversations not found or not owned' },
        { status: 403 }
      );
    }

    // Delete conversations (cascade deletes messages)
    const result = await prisma.conversation.deleteMany({
      where: {
        id: { in: ownedIds },
        userId,
      },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `Deleted ${result.count} conversation(s)`,
    });
  } catch (error) {
    logger.error('Batch delete conversations error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete conversations' },
      { status: 500 }
    );
  }
}
