/**
 * Chat API Route Handler
 * Supports: Azure OpenAI, Ollama (local)
 * SECURITY: Input/output filtering for child safety (Issue #30)
 * FEATURE: Function calling for tool execution (Issue #39)
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, getActiveProvider, type AIProvider } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { filterInput, sanitizeOutput } from '@/lib/safety';
import { CHAT_TOOL_DEFINITIONS } from '@/types/tools';
import { assessResponseTransparency, type TransparencyContext } from '@/lib/ai/transparency';
import { recordContentFiltered } from '@/lib/safety/audit';
import { normalizeUnicode } from '@/lib/safety/versioning';

// Import handlers to register them
import '@/lib/tools/handlers';

import { ChatRequest } from './types';
import { TOOL_CONTEXT } from './constants';
import { getDemoContext } from './helpers';
import { extractUserId } from './auth-handler';
import { loadUserSettings, checkBudgetLimit, checkBudgetWarning, updateBudget } from './budget-handler';
import { buildAllContexts } from './context-builders';
import { processToolCalls, buildToolChoice } from './tool-handler';

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`chat:${clientId}`, RATE_LIMITS.CHAT);

  if (!rateLimit.success) {
    logger.warn('Rate limit exceeded', { clientId, endpoint: '/api/chat' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: ChatRequest = await request.json();
    const { messages, systemPrompt, maestroId, conversationId, enableTools = true, enableMemory = true, requestedTool } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Authentication
    const userId = await extractUserId();

    // Load user settings and check budget
    let providerPreference: AIProvider | 'auto' | undefined;
    const userSettings = userId ? await loadUserSettings(userId) : null;

    if (userSettings?.provider && (userSettings.provider === 'azure' || userSettings.provider === 'ollama')) {
      providerPreference = userSettings.provider;
    }

    if (userSettings) {
      const budgetError = checkBudgetLimit(userId!, userSettings);
      if (budgetError) return budgetError;
      checkBudgetWarning(userId!, userSettings);
    }

    // Build enhanced system prompt with tool context
    let enhancedSystemPrompt = systemPrompt;
    if (requestedTool) {
      const toolContext = requestedTool === 'demo' ? getDemoContext(maestroId) : TOOL_CONTEXT[requestedTool];
      if (toolContext) {
        enhancedSystemPrompt = `${systemPrompt}\n\n${toolContext}`;
        logger.debug('Tool context injected', { requestedTool, maestroId });
      }
    }

    // Get last user message for safety filtering and RAG
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();

    // Build all contexts (memory, tool, RAG, adaptive)
    const contexts = await buildAllContexts({
      systemPrompt: enhancedSystemPrompt,
      userId,
      maestroId,
      conversationId,
      enableMemory,
      lastUserMessage: lastUserMessage?.content,
      adaptiveDifficultyMode: userSettings?.adaptiveDifficultyMode,
      requestedTool,
    });
    enhancedSystemPrompt = contexts.enhancedPrompt;

    // SECURITY: Normalize unicode and filter input
    if (lastUserMessage) {
      const { normalized, wasModified } = normalizeUnicode(lastUserMessage.content);
      if (wasModified) {
        logger.debug('Unicode normalized in user input', { clientId });
        lastUserMessage.content = normalized;
      }

      const filterResult = filterInput(lastUserMessage.content);
      if (!filterResult.safe && filterResult.action === 'block') {
        logger.warn('Content blocked by safety filter', {
          clientId,
          category: filterResult.category,
          severity: filterResult.severity,
        });
        recordContentFiltered(filterResult.category || 'unknown', {
          userId,
          maestroId,
          actionTaken: 'blocked',
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

    const providerConfig = getActiveProvider(providerPreference);

    try {
      if (requestedTool) {
        logger.info('Tool mode active', {
          requestedTool,
          toolsEnabled: enableTools,
          hasToolContext: !!TOOL_CONTEXT[requestedTool],
          maestroId,
        });
      }

      const toolChoice = buildToolChoice(enableTools, requestedTool);

      const result = await chatCompletion(messages, enhancedSystemPrompt, {
        tools: enableTools ? ([...CHAT_TOOL_DEFINITIONS] as typeof CHAT_TOOL_DEFINITIONS[number][]) : undefined,
        tool_choice: toolChoice,
        providerPreference,
      });

      logger.debug('Chat response', {
        hasToolCalls: !!(result.tool_calls && result.tool_calls.length > 0),
        toolCallCount: result.tool_calls?.length || 0,
        toolCallNames: result.tool_calls?.map(tc => tc.function.name) || [],
        contentLength: result.content?.length || 0,
      });

      // Handle tool calls
      if (result.tool_calls && result.tool_calls.length > 0) {
        const toolCallRefs = await processToolCalls(result.tool_calls, {
          maestroId,
          conversationId,
          userId,
        });

        return NextResponse.json({
          content: result.content || '',
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          maestroId,
          toolCalls: toolCallRefs,
          hasTools: true,
          hasMemory: contexts.hasMemory,
          hasToolContext: contexts.hasToolContext,
          hasRAG: contexts.hasRAG,
        });
      }

      // Sanitize output
      const sanitized = sanitizeOutput(result.content);
      if (sanitized.modified) {
        logger.warn('Output sanitized', {
          clientId,
          issuesFound: sanitized.issuesFound,
          categories: sanitized.categories,
        });
      }

      // Transparency assessment
      const transparencyContext: TransparencyContext = {
        response: sanitized.text,
        query: lastUserMessage?.content || '',
        ragResults: contexts.ragResultsForTransparency,
        usedKnowledgeBase: !!maestroId,
        maestroId,
      };
      const transparency = assessResponseTransparency(transparencyContext);

      // Update budget
      if (userId && userSettings && result.usage) {
        await updateBudget(userId, result.usage.total_tokens || 0, userSettings.totalSpent);
      }

      return NextResponse.json({
        content: sanitized.text,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        hasMemory: contexts.hasMemory,
        hasToolContext: contexts.hasToolContext,
        hasRAG: contexts.hasRAG,
        maestroId,
        sanitized: sanitized.modified,
        transparency: {
          confidence: transparency.confidence,
          citations: transparency.citations,
          hasHallucinations: transparency.hallucinationRisk.indicators.length > 0,
          needsCitation: transparency.hallucinationRisk.indicators.some((h: { type: string }) => h.type === 'factual_claim'),
        },
      });
    } catch (providerError) {
      const errorMessage = providerError instanceof Error ? providerError.message : 'Unknown provider error';

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
        { error: 'Chat request failed', message: errorMessage, provider: providerConfig?.provider ?? 'unknown' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Chat API error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const provider = getActiveProvider();

  if (!provider) {
    return NextResponse.json({ available: false, provider: null, message: 'No AI provider configured' });
  }

  return NextResponse.json({ available: true, provider: provider.provider, model: provider.model });
}
