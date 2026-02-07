/**
 * Streaming Chat API Route Handler
 * Server-Sent Events (SSE) streaming for chat completions
 *
 * IMPORTANT: This endpoint does NOT support tool calls.
 * For tool-enabled chat, use the standard /api/chat endpoint.
 *
 * @see ADR 0034 for streaming architecture
 */

import { NextResponse } from "next/server";
import {
  azureStreamingCompletion,
  getActiveProvider,
  getDeploymentForModel,
} from "@/lib/ai";
import { tierService } from "@/lib/tier";
import { getRequestLogger, getRequestId } from "@/lib/tracing";
import {
  checkRateLimitAsync,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { StreamingSanitizer } from "@/lib/safety";
import { pipe, withSentry, withCSRF } from "@/lib/api/middlewares";

import type { ChatRequest } from "../types";
import {
  getUserIdWithCoppaCheck,
  loadUserSettings,
  enhancePromptWithContext,
  checkInputSafety,
  updateBudget,
  createSSEResponse,
  MidStreamBudgetTracker,
} from "./helpers";

/** Feature flag for streaming - can be disabled via env var */
const STREAMING_ENABLED = process.env.ENABLE_CHAT_STREAMING !== "false";

export const POST = pipe(
  withSentry("/api/chat/stream"),
  withCSRF,
)(async (ctx) => {
  const request = ctx.req;

  if (!STREAMING_ENABLED) {
    const response = NextResponse.json(
      { error: "Streaming is disabled", fallback: "/api/chat" },
      { status: 503 },
    );
    response.headers.set("X-Request-ID", getRequestId(request));
    return response;
  }

  const log = getRequestLogger(request);

  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimitAsync(
    `chat:${clientId}`,
    RATE_LIMITS.CHAT,
  );

  if (!rateLimit.success) {
    log.warn("Rate limit exceeded", { clientId, endpoint: "/api/chat/stream" });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: ChatRequest = await request.json();
    const {
      messages,
      systemPrompt,
      maestroId,
      enableMemory = true,
      enableTools,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      const response = NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }

    // Streaming does not support tool calls - warn if requested
    if (enableTools) {
      log.debug("Tool calls requested but not supported in streaming mode", {
        maestroId,
      });
    }

    // Authentication + COPPA compliance check
    const coppaCheck = await getUserIdWithCoppaCheck();
    if (!coppaCheck.allowed) {
      const response = NextResponse.json(
        {
          error: "Parental consent required",
          code: "COPPA_CONSENT_REQUIRED",
          message:
            "Users under 13 require parental consent to use AI features.",
          fallback: "/api/chat",
        },
        { status: 403 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
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
          error: "Budget limit exceeded",
          message: `You have reached your budget limit of $${userSettings.budgetLimit.toFixed(2)}.`,
          fallback: "/api/chat",
        },
        { status: 402 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }

    // Tier-based model selection for streaming (ADR 0073)
    const tierModel = await tierService.getModelForUserFeature(
      userId ?? null,
      "chat",
    );
    const deploymentName = getDeploymentForModel(tierModel);

    log.debug("Tier-based model selected for streaming", {
      userId: userId || "anonymous",
      tierModel,
      deploymentName,
    });

    const config = getActiveProvider(providerPreference, deploymentName);
    if (!config) {
      const response = NextResponse.json(
        { error: "No AI provider configured", fallback: "/api/chat" },
        { status: 503 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }

    if (config.provider !== "azure") {
      const response = NextResponse.json(
        {
          error: "Streaming only available with Azure OpenAI",
          fallback: "/api/chat",
        },
        { status: 400 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }

    // Enhance prompt with memory and RAG
    const enhancedSystemPrompt = await enhancePromptWithContext(
      systemPrompt,
      userId,
      maestroId,
      messages,
      enableMemory,
    );

    // Safety filter on input
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    if (lastUserMessage) {
      const safetyBlock = checkInputSafety(lastUserMessage.content);
      if (safetyBlock) {
        log.warn("Content blocked by safety filter", { clientId });
        return createSSEResponse(async function* () {
          yield `data: ${JSON.stringify({ content: safetyBlock.response, blocked: true })}\n\n`;
          yield "data: [DONE]\n\n";
        });
      }
    }

    // Create streaming response with mid-stream budget tracking (F-13)
    const sanitizer = new StreamingSanitizer();
    const encoder = new TextEncoder();
    const budgetTracker =
      userId && userSettings
        ? new MidStreamBudgetTracker(
            userSettings.budgetLimit,
            userSettings.totalSpent,
            userId,
          )
        : null;

    const stream = new ReadableStream({
      async start(controller) {
        let totalTokens = 0;
        let budgetExceededMidStream = false;

        try {
          const generator = azureStreamingCompletion(
            config,
            messages.map((m) => ({ role: m.role, content: m.content })),
            enhancedSystemPrompt,
            { signal: request.signal },
          );

          for await (const chunk of generator) {
            if (chunk.type === "content" && chunk.content) {
              // Mid-stream budget check (F-13)
              if (budgetTracker && budgetTracker.trackChunk(chunk.content)) {
                budgetExceededMidStream = true;
                const budgetMsg =
                  "\n\n[Budget limit reached. Response truncated.]";
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
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: sanitized })}\n\n`,
                  ),
                );
              }
            } else if (chunk.type === "content_filter") {
              const msg =
                "I cannot respond to this request due to content filtering.";
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: msg, filtered: true })}\n\n`,
                ),
              );
            } else if (chunk.type === "usage" && chunk.usage) {
              totalTokens = chunk.usage.total_tokens;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ usage: chunk.usage })}\n\n`,
                ),
              );
            } else if (chunk.type === "error") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: chunk.error })}\n\n`,
                ),
              );
            }
          }

          if (!budgetExceededMidStream) {
            const remaining = sanitizer.flush();
            if (remaining) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: remaining })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));

          // Update budget: use actual tokens if available, else estimated
          if (userId && userSettings) {
            const tokensToCharge =
              totalTokens > 0
                ? totalTokens
                : (budgetTracker?.getEstimatedTokens() ?? 0);
            if (tokensToCharge > 0) {
              await updateBudget(userId, tokensToCharge);
            }
          }
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            log.error("Streaming error", { error: String(error) });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`,
              ),
            );
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Request-ID": getRequestId(request),
      },
    });
  } catch (error) {
    log.error("Chat stream API error", { error: String(error) });
    const response = NextResponse.json(
      { error: "Internal server error", fallback: "/api/chat" },
      { status: 500 },
    );
    response.headers.set("X-Request-ID", getRequestId(request));
    return response;
  }
});

/** GET endpoint for connection test */
export const GET = pipe(withSentry("/api/chat/stream"))(async (ctx) => {
  const config = getActiveProvider();
  const providerSupportsStreaming = config?.provider === "azure";
  const streamingAvailable = STREAMING_ENABLED && providerSupportsStreaming;

  const response = NextResponse.json({
    streaming: streamingAvailable,
    provider: config?.provider ?? null,
    endpoint: "/api/chat/stream",
    method: "POST",
    note: "Tool calls not supported - use /api/chat for tools",
  });
  response.headers.set("X-Request-ID", getRequestId(ctx.req));
  return response;
});
