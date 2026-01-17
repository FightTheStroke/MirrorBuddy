/**
 * Streaming Chat API Route Handler
 * Server-Sent Events (SSE) streaming for chat completions
 *
 * IMPORTANT: This endpoint does NOT support tool calls.
 * For tool-enabled chat, use the standard /api/chat endpoint.
 *
 * @see ADR 0034 for streaming architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { azureStreamingCompletion, getActiveProvider } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { StreamingSanitizer } from '@/lib/safety';

import type { ChatRequest } from '../types';
import {
  getUserId,
  loadUserSettings,
  enhancePromptWithContext,
  checkInputSafety,
  updateBudget,
  createSSEResponse,
  MidStreamBudgetTracker,
} from './helpers';

/** Feature flag for streaming - can be disabled via env var */
const STREAMING_ENABLED = process.env.ENABLE_CHAT_STREAMING !== 'false';

export async function POST(request: NextRequest) {
  if (!STREAMING_ENABLED) {
    return NextResponse.json(
      { error: 'Streaming is disabled', fallback: '/api/chat' },
      { status: 503 }
    );
  }

  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`chat:${clientId}`, RATE_LIMITS.CHAT);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/chat/stream' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: ChatRequest = await request.json();
    const { messages, systemPrompt, maestroId, enableMemory = true, enableTools } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Streaming does not support tool calls - warn if requested
    if (enableTools) {
      logger.debug('Tool calls requested but not supported in streaming mode', { maestroId });
    }

    const userId = await getUserId();
    const { settings: userSettings, providerPreference } = userId
      ? await loadUserSettings(userId)
      : { settings: null, providerPreference: undefined };

    // Budget check
    if (userSettings && userSettings.totalSpent >= userSettings.budgetLimit) {
      return NextResponse.json(
        {
          error: 'Budget limit exceeded',
          message: `You have reached your budget limit of $${userSettings.budgetLimit.toFixed(2)}.`,
          fallback: '/api/chat',
        },
        { status: 402 }
      );
    }

    const config = getActiveProvider(providerPreference);
    if (!config) {
      return NextResponse.json(
        { error: 'No AI provider configured', fallback: '/api/chat' },
        { status: 503 }
      );
    }

    if (config.provider !== 'azure') {
      return NextResponse.json(
        { error: 'Streaming only available with Azure OpenAI', fallback: '/api/chat' },
        { status: 400 }
      );
    }

    // Enhance prompt with memory and RAG
    const enhancedSystemPrompt = await enhancePromptWithContext(
      systemPrompt,
      userId,
      maestroId,
      messages,
      enableMemory
    );

    // Safety filter on input
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      const safetyBlock = checkInputSafety(lastUserMessage.content);
      if (safetyBlock) {
        logger.warn('Content blocked by safety filter', { clientId });
        return createSSEResponse(async function* () {
          yield `data: ${JSON.stringify({ content: safetyBlock.response, blocked: true })}\n\n`;
          yield 'data: [DONE]\n\n';
        });
      }
    }

    // Create streaming response with mid-stream budget tracking (F-13)
    const sanitizer = new StreamingSanitizer();
    const encoder = new TextEncoder();
    const budgetTracker = userId && userSettings
      ? new MidStreamBudgetTracker(userSettings.budgetLimit, userSettings.totalSpent, userId)
      : null;

    const stream = new ReadableStream({
      async start(controller) {
        let totalTokens = 0;
        let budgetExceededMidStream = false;

        try {
          const generator = azureStreamingCompletion(
            config,
            messages.map(m => ({ role: m.role, content: m.content })),
            enhancedSystemPrompt,
            { signal: request.signal }
          );

          for await (const chunk of generator) {
            if (chunk.type === 'content' && chunk.content) {
              // Mid-stream budget check (F-13)
              if (budgetTracker && budgetTracker.trackChunk(chunk.content)) {
                budgetExceededMidStream = true;
                const budgetMsg = '\n\n[Budget limit reached. Response truncated.]';
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  content: budgetMsg,
                  budgetExceeded: true,
                })}\n\n`));
                break;
              }

              const sanitized = sanitizer.processChunk(chunk.content);
              if (sanitized) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: sanitized })}\n\n`));
              }
            } else if (chunk.type === 'content_filter') {
              const msg = 'I cannot respond to this request due to content filtering.';
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: msg, filtered: true })}\n\n`));
            } else if (chunk.type === 'usage' && chunk.usage) {
              totalTokens = chunk.usage.total_tokens;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ usage: chunk.usage })}\n\n`));
            } else if (chunk.type === 'error') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: chunk.error })}\n\n`));
            }
          }

          if (!budgetExceededMidStream) {
            const remaining = sanitizer.flush();
            if (remaining) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: remaining })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          // Update budget: use actual tokens if available, else estimated
          if (userId && userSettings) {
            const tokensToCharge = totalTokens > 0 ? totalTokens : budgetTracker?.getEstimatedTokens() ?? 0;
            if (tokensToCharge > 0) {
              await updateBudget(userId, tokensToCharge);
            }
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            logger.error('Streaming error', { error: String(error) });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    logger.error('Chat stream API error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error', fallback: '/api/chat' },
      { status: 500 }
    );
  }
}

/** GET endpoint for connection test */
export async function GET() {
  const config = getActiveProvider();
  const providerSupportsStreaming = config?.provider === 'azure';
  const streamingAvailable = STREAMING_ENABLED && providerSupportsStreaming;

  return NextResponse.json({
    streaming: streamingAvailable,
    provider: config?.provider ?? null,
    endpoint: '/api/chat/stream',
    method: 'POST',
    note: 'Tool calls not supported - use /api/chat for tools',
  });
}
