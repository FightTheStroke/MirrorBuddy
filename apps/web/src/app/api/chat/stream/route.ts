/**
 * Streaming Chat API Route Handler
 * Server-Sent Events (SSE) streaming for chat completions
 *
 * IMPORTANT: This endpoint does NOT support tool calls.
 * For tool-enabled chat, use the standard /api/chat endpoint.
 *
 * @see ADR 0034 for streaming architecture
 */

import { NextResponse } from 'next/server';
import {
  azureStreamingCompletion,
  getActiveProvider,
  getDeploymentForModel,
} from '@/lib/ai/server';
import { tierService } from '@/lib/tier/server';
import { getRequestLogger, getRequestId } from '@/lib/tracing';
import {
  checkRateLimitAsync,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from '@/lib/rate-limit';
import {
  StreamingSanitizer,
  checkSTEMSafety,
  normalizeUnicode,
  detectBias,
  SAFE_RESPONSES,
  detectJailbreak,
  getJailbreakResponse,
  buildContext,
} from '@/lib/safety';
import { recordContentFiltered } from '@/lib/safety/server';
import { detectLocaleFromNextRequest } from '@/lib/i18n/locale-detection';
import { pipe, withSentry, withCSRF } from '@/lib/api/middlewares';
import { applyAgeGatePrompt } from '@/lib/conversation/age-gate-injector';

import type { ChatRequest } from '../types';
import {
  getUserIdWithCoppaCheck,
  loadUserSettings,
  enhancePromptWithContext,
  checkInputSafety,
  updateBudget,
  createSSEResponse,
  MidStreamBudgetTracker,
  getABModelOverride,
} from './helpers';

/** Feature flag for streaming - can be disabled via env var */

export const revalidate = 0;
const STREAMING_ENABLED = process.env.ENABLE_CHAT_STREAMING !== 'false';

export const POST = pipe(
  withSentry('/api/chat/stream'),
  withCSRF,
)(async (ctx) => {
  const request = ctx.req;

  if (!STREAMING_ENABLED) {
    const response = NextResponse.json(
      { error: 'Streaming is disabled', fallback: '/api/chat' },
      { status: 503 },
    );
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  }

  const log = getRequestLogger(request);

  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimitAsync(`chat:${clientId}`, RATE_LIMITS.CHAT);

  if (!rateLimit.success) {
    log.warn('Rate limit exceeded', { clientId, endpoint: '/api/chat/stream' });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: ChatRequest = await request.json();
    const {
      messages,
      systemPrompt,
      maestroId,
      conversationId,
      enableMemory = true,
      enableTools,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      const response = NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
      response.headers.set('X-Request-ID', getRequestId(request));
      return response;
    }

    // Streaming does not support tool calls - warn if requested
    if (enableTools) {
      log.debug('Tool calls requested but not supported in streaming mode', {
        maestroId,
      });
    }

    // Authentication + COPPA compliance check
    const coppaCheck = await getUserIdWithCoppaCheck();
    if (!coppaCheck.allowed) {
      const response = NextResponse.json(
        {
          error: 'Parental consent required',
          code: 'COPPA_CONSENT_REQUIRED',
          message: 'Users under 13 require parental consent to use AI features.',
          fallback: '/api/chat',
        },
        { status: 403 },
      );
      response.headers.set('X-Request-ID', getRequestId(request));
      return response;
    }
    const userId = coppaCheck.userId;

    const { settings: userSettings, providerPreference } = userId
      ? await loadUserSettings(userId)
      : { settings: null, providerPreference: undefined };

    // Budget check
    if (userSettings && userSettings.totalSpent >= userSettings.budgetLimit) {
      const response = NextResponse.json(
        {
          error: 'Budget limit exceeded',
          message: `You have reached your budget limit of $${userSettings.budgetLimit.toFixed(2)}.`,
          fallback: '/api/chat',
        },
        { status: 402 },
      );
      response.headers.set('X-Request-ID', getRequestId(request));
      return response;
    }

    // Tier-based model selection for streaming (ADR 0073)
    const tierModel = await tierService.getModelForUserFeature(userId ?? null, 'chat');
    const abModelOverride = await getABModelOverride(userId, conversationId);
    const selectedModel = abModelOverride ?? tierModel;
    const deploymentName = getDeploymentForModel(selectedModel);

    log.debug('Tier-based model selected for streaming', {
      userId: userId || 'anonymous',
      tierModel,
      abModelOverride,
      deploymentName,
    });

    const config = getActiveProvider(providerPreference, deploymentName);
    if (!config) {
      const response = NextResponse.json(
        { error: 'No AI provider configured', fallback: '/api/chat' },
        { status: 503 },
      );
      response.headers.set('X-Request-ID', getRequestId(request));
      return response;
    }

    if (config.provider !== 'azure') {
      const response = NextResponse.json(
        {
          error: 'Streaming only available with Azure OpenAI',
          fallback: '/api/chat',
        },
        { status: 400 },
      );
      response.headers.set('X-Request-ID', getRequestId(request));
      return response;
    }

    // Enhance prompt with memory and RAG
    let enhancedSystemPrompt = await enhancePromptWithContext(
      systemPrompt,
      userId,
      maestroId,
      messages,
      enableMemory,
    );

    // T1.10 (D-10): adapt language/topic guidance to the student's age when
    // a real profile age is on record, mirroring the non-streaming route.
    enhancedSystemPrompt = await applyAgeGatePrompt(enhancedSystemPrompt, userId);

    // Safety filter on input
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
    if (lastUserMessage) {
      // SECURITY: normalize Unicode (zero-width chars, homoglyphs) BEFORE the
      // safety checks, mirroring the non-streaming route — raw input would let
      // e.g. 'T​NT' bypass the blocklists (review finding #458 F3).
      // filterInput/checkSTEMSafety only lowercase/trim internally.
      const { normalized, wasModified } = normalizeUnicode(lastUserMessage.content);
      if (wasModified) {
        log.debug('Unicode normalized in user input', { clientId });
        lastUserMessage.content = normalized;
      }

      // T1.2: pass context so crisis escalation (logSafetyEvent +
      // escalateCrisisDetected + notifyParentOfCrisis) runs on the streaming
      // path, mirroring the non-streaming route. conversationId may be
      // undefined for a brand-new conversation; the escalation helpers fall
      // back to 'anonymous'/'' so escalation is never skipped for that reason.
      const safetyBlock = checkInputSafety(lastUserMessage.content, {
        userId,
        conversationId,
        maestroId,
        locale: detectLocaleFromNextRequest(request),
      });
      if (safetyBlock) {
        log.warn('Content blocked by safety filter', { clientId });
        return createSSEResponse(async function* () {
          yield `data: ${JSON.stringify({ content: safetyBlock.response, blocked: true })}\n\n`;
          yield 'data: [DONE]\n\n';
        });
      }

      // T1.5: Advanced jailbreak / prompt-injection gate BEFORE the stream
      // starts, mirroring the non-streaming route and the STEM gate below.
      // checkInputSafety (filterInput) above already blocks obvious
      // JAILBREAK_PATTERNS; the dedicated detector catches sophisticated
      // attempts the regex misses (encoding, multi-turn, crescendo, code
      // injection). Context from the message history activates multi-turn
      // detection. Gate on the module's own action (block/terminate_session)
      // so low/medium 'warn' scores do not over-block. Jailbreak detection is
      // on USER INPUT, so it runs pre-stream (fail-closed, no LLM call) — NOT
      // post-hoc like bias, which needs the full model response.
      const jailbreakResult = detectJailbreak(lastUserMessage.content, buildContext(messages));
      if (jailbreakResult.action === 'block' || jailbreakResult.action === 'terminate_session') {
        log.warn('Jailbreak attempt blocked by detector (streaming)', {
          clientId,
          threatLevel: jailbreakResult.threatLevel,
          categories: jailbreakResult.categories,
          confidence: jailbreakResult.confidence,
        });
        recordContentFiltered('jailbreak', {
          userId,
          maestroId,
          confidence: jailbreakResult.confidence,
          actionTaken: 'blocked',
        });
        const safeResponse = getJailbreakResponse(jailbreakResult);
        return createSSEResponse(async function* () {
          yield `data: ${JSON.stringify({
            content: safeResponse,
            blocked: true,
            category: 'jailbreak',
          })}\n\n`;
          yield 'data: [DONE]\n\n';
        });
      }

      // T1.3: STEM safety check (Amodei 2026) - block dangerous STEM queries
      // BEFORE starting the stream, mirroring the non-streaming route.
      if (maestroId) {
        const stemResult = checkSTEMSafety(lastUserMessage.content, maestroId);
        if (stemResult.blocked) {
          log.warn('STEM safety filter triggered', {
            clientId,
            subject: stemResult.subject,
            category: stemResult.category,
          });
          recordContentFiltered('stem_safety', {
            userId,
            maestroId,
            actionTaken: 'blocked',
          });
          return createSSEResponse(async function* () {
            yield `data: ${JSON.stringify({
              content: stemResult.safeResponse,
              blocked: true,
              category: `stem_${stemResult.category}`,
              alternatives: stemResult.alternatives,
            })}\n\n`;
            yield 'data: [DONE]\n\n';
          });
        }
      }
    }

    // Create streaming response with mid-stream budget tracking (F-13)
    const sanitizer = new StreamingSanitizer();
    const encoder = new TextEncoder();
    const budgetTracker =
      userId && userSettings
        ? new MidStreamBudgetTracker(userSettings.budgetLimit, userSettings.totalSpent, userId)
        : null;

    const stream = new ReadableStream({
      async start(controller) {
        let totalTokens = 0;
        let budgetExceededMidStream = false;
        // T1.4 (streaming): the full response text is accumulated so bias
        // detection can run once the stream completes. Streaming means
        // already-sent tokens cannot be un-sent — see the post-hoc audit +
        // corrective-message compromise documented below (issue #467).
        let fullResponseText = '';

        try {
          const generator = azureStreamingCompletion(
            config,
            messages.map((m) => ({ role: m.role, content: m.content })),
            enhancedSystemPrompt,
            { signal: request.signal },
          );

          for await (const chunk of generator) {
            if (chunk.type === 'content' && chunk.content) {
              // Mid-stream budget check (F-13)
              if (budgetTracker && budgetTracker.trackChunk(chunk.content)) {
                budgetExceededMidStream = true;
                const budgetMsg = '\n\n[Budget limit reached. Response truncated.]';
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      content: budgetMsg,
                      budgetExceeded: true,
                    })}\n\n`,
                  ),
                );
                break;
              }

              const sanitized = sanitizer.processChunk(chunk.content);
              if (sanitized) {
                fullResponseText += sanitized;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: sanitized })}\n\n`),
                );
              }
            } else if (chunk.type === 'content_filter') {
              const msg = 'I cannot respond to this request due to content filtering.';
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: msg, filtered: true })}\n\n`),
              );
            } else if (chunk.type === 'usage' && chunk.usage) {
              totalTokens = chunk.usage.total_tokens;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ usage: chunk.usage })}\n\n`),
              );
            } else if (chunk.type === 'error') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: chunk.error })}\n\n`),
              );
            }
          }

          if (!budgetExceededMidStream) {
            const remaining = sanitizer.flush();
            if (remaining) {
              fullResponseText += remaining;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: remaining })}\n\n`),
              );
            }
          }

          // T1.4 (streaming): bias detection on the full accumulated output.
          // Unlike the non-streaming route, tokens already reached the client
          // by the time this runs — full prevention would require buffering
          // the entire response and losing the point of streaming. Instead:
          // audit for compliance visibility (closes issue #467) and append a
          // corrective message the student/parent will see, same shape as the
          // existing content_filter mid-stream event.
          if (!budgetExceededMidStream && fullResponseText) {
            const biasResult = detectBias(fullResponseText);
            if (biasResult.hasBias && !biasResult.safeForEducation) {
              log.warn('Bias detected in streamed AI response (post-hoc)', {
                clientId,
                maestroId,
                riskScore: biasResult.riskScore,
                categories: biasResult.detections.map((d) => d.category),
              });
              recordContentFiltered('bias', {
                userId,
                maestroId,
                actionTaken: 'flagged_post_stream',
              });
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    content: `\n\n${SAFE_RESPONSES.jailbreak}`,
                    biasCorrection: true,
                    category: 'bias',
                  })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          // Update budget: use actual tokens if available, else estimated
          if (userId && userSettings) {
            const tokensToCharge =
              totalTokens > 0 ? totalTokens : (budgetTracker?.getEstimatedTokens() ?? 0);
            if (tokensToCharge > 0) {
              await updateBudget(userId, tokensToCharge);
            }
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            log.error('Streaming error', { error: String(error) });
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`),
            );
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
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Request-ID': getRequestId(request),
      },
    });
  } catch (error) {
    log.error('Chat stream API error', { error: String(error) });
    const response = NextResponse.json(
      { error: 'Internal server error', fallback: '/api/chat' },
      { status: 500 },
    );
    response.headers.set('X-Request-ID', getRequestId(request));
    return response;
  }
});

/** GET endpoint for connection test */
export const GET = pipe(withSentry('/api/chat/stream'))(async (ctx) => {
  const config = getActiveProvider();
  const providerSupportsStreaming = config?.provider === 'azure';
  const streamingAvailable = STREAMING_ENABLED && providerSupportsStreaming;

  const response = NextResponse.json({
    streaming: streamingAvailable,
    provider: config?.provider ?? null,
    endpoint: '/api/chat/stream',
    method: 'POST',
    note: 'Tool calls not supported - use /api/chat for tools',
  });
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});
