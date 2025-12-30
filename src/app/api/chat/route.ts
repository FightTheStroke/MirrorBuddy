// ============================================================================
// API ROUTE: Chat completions
// Supports: Azure OpenAI, Ollama (local)
// NEVER: Direct OpenAI API, Anthropic
// SECURITY: Input/output filtering for child safety (Issue #30)
// FEATURE: Function calling for tool execution (Issue #39)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, getActiveProvider } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { filterInput, sanitizeOutput } from '@/lib/safety';
import { CHAT_TOOL_DEFINITIONS } from '@/types/tools';
import { executeToolCall } from '@/lib/tools/tool-executor';
// Import handlers to register them
import '@/lib/tools/handlers';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  maestroId: string;
  enableTools?: boolean; // Optional: enable tool calling (default: true)
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
    const { messages, systemPrompt, maestroId, enableTools = true } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // SECURITY: Filter the last user message for safety (Issue #30)
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      const filterResult = filterInput(lastUserMessage.content);
      if (!filterResult.safe && filterResult.action === 'block') {
        logger.warn('Content blocked by safety filter', {
          clientId,
          category: filterResult.category,
          severity: filterResult.severity,
        });
        return NextResponse.json({
          content: filterResult.suggestedResponse,
          provider: 'safety_filter',
          model: 'content-filter',
          blocked: true,
          category: filterResult.category,
        });
      }
    }

    // Get active provider info for response
    const providerConfig = getActiveProvider();

    try {
      // Call AI with optional tool definitions
      // Cast to mutable array since chatCompletion expects ToolDefinition[]
      const result = await chatCompletion(messages, systemPrompt, {
        tools: enableTools ? ([...CHAT_TOOL_DEFINITIONS] as typeof CHAT_TOOL_DEFINITIONS[number][]) : undefined,
        tool_choice: enableTools ? 'auto' : 'none',
      });

      // Handle tool calls if present
      if (result.tool_calls && result.tool_calls.length > 0) {
        const toolResults = [];

        for (const toolCall of result.tool_calls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const toolResult = await executeToolCall(
              toolCall.function.name,
              args,
              { maestroId, conversationId: undefined }
            );
            toolResults.push({
              toolCallId: toolCall.id,
              functionName: toolCall.function.name,
              result: toolResult,
            });
          } catch (toolError) {
            logger.error('Tool execution failed', {
              toolCall: toolCall.function.name,
              error: String(toolError),
            });
            toolResults.push({
              toolCallId: toolCall.id,
              functionName: toolCall.function.name,
              result: {
                success: false,
                error: toolError instanceof Error ? toolError.message : 'Tool execution failed',
              },
            });
          }
        }

        // Return response with tool results
        return NextResponse.json({
          content: result.content || '',
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          maestroId,
          toolCalls: toolResults,
          hasTools: true,
        });
      }

      // SECURITY: Sanitize AI output before returning (Issue #30)
      const sanitized = sanitizeOutput(result.content);
      if (sanitized.modified) {
        logger.warn('Output sanitized', {
          clientId,
          issuesFound: sanitized.issuesFound,
          categories: sanitized.categories,
        });
      }

      return NextResponse.json({
        content: sanitized.text,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        maestroId,
        sanitized: sanitized.modified,
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
