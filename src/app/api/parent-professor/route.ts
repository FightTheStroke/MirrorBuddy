/**
 * API ROUTE: Parent-Professor Conversations (Issue #63)
 * POST: Create parent mode conversation with a Maestro
 * GET: List parent conversations
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { chatCompletion, getActiveProvider } from '@/lib/ai/providers';
import {
  generateParentModePrompt,
  getParentModeGreeting,
} from '@/lib/ai/parent-mode';
import { filterInput, sanitizeOutput } from '@/lib/safety';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import {
  getOrCreateParentConversation,
  addConversationMessage,
  updateConversationMetadata,
  getStudentLearnings,
  formatConversationResponse,
} from './helpers';

interface ParentChatRequest {
  maestroId: string;
  studentId: string;
  studentName: string;
  message: string;
  conversationId?: string;
  maestroSystemPrompt: string;
  maestroDisplayName: string;
}

/**
 * POST - Create or continue parent mode conversation
 */
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`parent-chat:${clientId}`, RATE_LIMITS.CHAT);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/parent-professor' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const body: ParentChatRequest = await request.json();
    const {
      maestroId,
      studentId,
      studentName,
      message,
      conversationId,
      maestroSystemPrompt,
      maestroDisplayName,
    } = body;

    if (!maestroId || !studentId || !studentName || !message) {
      return NextResponse.json(
        { error: 'maestroId, studentId, studentName, and message are required' },
        { status: 400 }
      );
    }

    const filterResult = filterInput(message);
    if (!filterResult.safe && filterResult.action === 'block') {
      logger.warn('Parent content blocked', { clientId, category: filterResult.category });
      return NextResponse.json({
        content: filterResult.suggestedResponse,
        blocked: true,
      });
    }

    const learnings = await getStudentLearnings(studentId, maestroId);

    const parentModePrompt = generateParentModePrompt(
      maestroSystemPrompt,
      learnings,
      studentName
    );

    const result = await getOrCreateParentConversation(
      conversationId,
      userId,
      maestroId,
      maestroDisplayName,
      studentId,
      studentName
    );

    if (!result.success || !result.conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = result.messages || [];

    if (result.isNew) {
      const greeting = getParentModeGreeting(
        maestroDisplayName,
        studentName,
        learnings.length > 0
      );

      await addConversationMessage(result.conversation.id, 'assistant', greeting);
      messages.push({ role: 'assistant', content: greeting });
    }

    await addConversationMessage(result.conversation.id, 'user', message);
    messages.push({ role: 'user', content: message });

    const providerConfig = getActiveProvider();
    if (!providerConfig) {
      return NextResponse.json(
        { error: 'No AI provider available' },
        { status: 503 }
      );
    }

    const aiResult = await chatCompletion(
      messages,
      parentModePrompt,
      { tool_choice: 'none' }
    );

    const sanitized = sanitizeOutput(aiResult.content);

    if (!result.conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    await addConversationMessage(result.conversation.id, 'assistant', sanitized.text);
    await updateConversationMetadata(result.conversation.id, result.isNew ? 3 : 2);

    logger.info('Parent-professor conversation', {
      conversationId: result.conversation.id,
      maestroId,
      studentId,
    });

    return NextResponse.json({
      content: sanitized.text,
      conversationId: result.conversation.id,
      provider: aiResult.provider,
      model: aiResult.model,
      isParentMode: true,
    });
  } catch (error) {
    logger.error('Parent-professor API error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - List parent conversations
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mirrorbuddy-user-id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const { prisma } = await import('@/lib/db');

    const conversations = await prisma.conversation.findMany({
      where: {
        userId,
        isParentMode: true,
        ...(studentId && { studentId }),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json(
      conversations.map(formatConversationResponse)
    );
  } catch (error) {
    logger.error('Parent conversations GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    );
  }
}
