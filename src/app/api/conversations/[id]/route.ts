// ============================================================================
// API ROUTE: Single conversation
// GET: Get conversation with messages
// PUT: Update conversation (title, summary, etc.)
// DELETE: Delete conversation
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/session-auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await validateAuth();
    const { id } = await params;

    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100, // Limit messages, use pagination for more
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...conversation,
      topics: JSON.parse(conversation.topics || '[]'),
      keyFacts: conversation.keyFacts ? JSON.parse(conversation.keyFacts) : null,
    });
  } catch (error) {
    logger.error('Conversation GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get conversation' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await validateAuth();
    const { id } = await params;

    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    // Verify ownership
    const existing = await prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const data = await request.json();
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.topics !== undefined) {
      updateData.topics = JSON.stringify(data.topics);
    }
    if (data.keyFacts !== undefined) {
      updateData.keyFacts = JSON.stringify(data.keyFacts);
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...conversation,
      topics: JSON.parse(conversation.topics || '[]'),
      keyFacts: conversation.keyFacts ? JSON.parse(conversation.keyFacts) : null,
    });
  } catch (error) {
    logger.error('Conversation PUT error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await validateAuth();
    const { id } = await params;

    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    // Verify ownership
    const existing = await prisma.conversation.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    await prisma.conversation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Conversation DELETE error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
