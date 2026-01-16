// ============================================================================
// API ROUTE: Parent-Professor Conversations (Issue #63)
// POST: Create parent mode conversation with a Maestro
// GET: List parent conversations
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/session-auth';
import { prisma } from '@/lib/db';
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
import type { ParentChatRequest } from './types';

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`parent-chat:${clientId}`, RATE_LIMITS.CHAT);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/parent-professor' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

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

    // Safety filter on parent message
    const filterResult = filterInput(message);
    if (!filterResult.safe && filterResult.action === 'block') {
      logger.warn('Parent content blocked', { clientId, category: filterResult.category });
      return NextResponse.json({
        content: filterResult.suggestedResponse,
        blocked: true,
      });
    }

    // Fetch learnings for the student
    const learnings = await getStudentLearnings(studentId, maestroId);

    // Generate parent mode system prompt
    const parentModePrompt = generateParentModePrompt(
      maestroSystemPrompt,
      learnings,
      studentName
    );

    // Get or create conversation
    const convResult = await getOrCreateParentConversation(
      conversationId,
      userId,
      maestroId,
      maestroDisplayName,
      studentId,
      studentName
    );

    if (!convResult.success) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const { conversation, isNew } = convResult;
    let messages: Array<{ role: string; content: string }> = convResult.messages || [];

    // Add greeting if new conversation
    if (isNew) {
      const greeting = getParentModeGreeting(
        maestroDisplayName,
        studentName,
        learnings.length > 0
      );
      await addConversationMessage(conversation.id, 'assistant', greeting);
      messages.push({ role: 'assistant', content: greeting });
    }

    // Add user message to database
    await addConversationMessage(conversation.id, 'user', message);

    // Add to messages for AI call
    messages.push({ role: 'user', content: message });

    // Get AI response
    const providerConfig = getActiveProvider();
    if (!providerConfig) {
      return NextResponse.json(
        { error: 'No AI provider available' },
        { status: 503 }
      );
    }

    const result = await chatCompletion(
      messages.map(m => ({ ...m, role: m.role as 'user' | 'assistant' | 'system' })),
      parentModePrompt,
      { tool_choice: 'none' } // No tools in parent mode
    );

    // Sanitize output
    const sanitized = sanitizeOutput(result.content);

    // Save assistant response to database
    await addConversationMessage(conversation.id, 'assistant', sanitized.text);

    // Update conversation metadata
    await updateConversationMetadata(conversation.id, 2);

    logger.info('Parent-professor conversation', {
      conversationId: conversation.id,
      maestroId,
      studentId,
      messageCount: messages.length + 1,
    });

    return NextResponse.json({
      content: sanitized.text,
      conversationId: conversation.id,
      provider: result.provider,
      model: result.model,
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

// GET: List parent conversations
export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const userId = auth.userId!;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const limit = parseInt(searchParams.get('limit') || '20');

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

    return NextResponse.json(conversations.map(formatConversationResponse));
  } catch (error) {
    logger.error('Parent conversations GET error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    );
  }
}
