// ============================================================================
// API ROUTE: Chat completions
// Supports: Azure OpenAI, Ollama (local)
// NEVER: Direct OpenAI API, Anthropic
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, getActiveProvider } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  maestroId: string;
}

export async function POST(request: NextRequest) {
  // Rate limiting: 20 requests per minute per IP
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`chat:${clientId}`, RATE_LIMITS.CHAT);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/chat' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: ChatRequest = await request.json();
    const { messages, systemPrompt, maestroId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get active provider info for response
    const providerConfig = getActiveProvider();

    try {
      const result = await chatCompletion(messages, systemPrompt);

      return NextResponse.json({
        content: result.content,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        maestroId,
      });
    } catch (providerError) {
      // Provider-specific error handling
      const errorMessage =
        providerError instanceof Error
          ? providerError.message
          : 'Unknown provider error';

      // Check if it's an Ollama availability issue
      if (errorMessage.includes('Ollama is not running')) {
        return NextResponse.json(
          {
            error: 'No AI provider available',
            message: errorMessage,
            help: 'Configure Azure OpenAI or start Ollama: ollama serve && ollama pull llama3.2',
            provider: providerConfig?.provider ?? 'none',
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: 'Chat request failed',
          message: errorMessage,
          provider: providerConfig?.provider ?? 'unknown',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Chat API error', { error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check provider status
export async function GET() {
  const provider = getActiveProvider();

  if (!provider) {
    return NextResponse.json({
      available: false,
      provider: null,
      message: 'No AI provider configured',
    });
  }

  return NextResponse.json({
    available: true,
    provider: provider.provider,
    model: provider.model,
  });
}
