/**
 * Chat API Route Handler
 * Supports: Azure OpenAI, Ollama (local)
 * SECURITY: Input/output filtering for child safety (Issue #30)
 * FEATURE: Function calling for tool execution (Issue #39)
 */

import { NextResponse } from "next/server";
import {
  chatCompletion,
  getActiveProvider,
  type AIProvider,
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
import { filterInput, sanitizeOutput } from "@/lib/safety";
import { checkSTEMSafety } from "@/lib/safety";
import { recordMessage, recordSessionStart } from "@/lib/safety";
import { analyzeIndependence } from "@/lib/gamification/independence-tracker";
import { awardPoints } from "@/lib/gamification/db";
import { CHAT_TOOL_DEFINITIONS } from "@/types/tools";
import {
  assessResponseTransparency,
  type TransparencyContext,
} from "@/lib/ai";
import { recordContentFiltered } from "@/lib/safety";
import { normalizeUnicode } from "@/lib/safety";

// Import handlers to register them
import "@/lib/tools/handlers";

import { isSessionBlocked } from "@/lib/trial/anti-abuse";
import { prisma } from "@/lib/db";

import { ChatRequest } from "./types";
import { TOOL_CONTEXT } from "./constants";
import { getDemoContext } from "./helpers";
import { extractUserIdWithCoppaCheck } from "./auth-handler";
import {
  loadUserSettings,
  checkBudgetLimit,
  checkBudgetWarning,
  updateBudget,
} from "./budget-handler";
import { buildAllContexts } from "./context-builders";
import { processToolCalls, buildToolChoice } from "./tool-handler";
import {
  checkTrialForAnonymous,
  incrementTrialUsage,
  incrementTrialToolUsage,
  checkTrialToolLimit,
} from "./trial-handler";
import { incrementTrialBudgetWithPublish } from "@/lib/trial/trial-budget-service";
import { TOKEN_COST_PER_UNIT } from "./stream/helpers";
import { pipe, withSentry, withCSRF } from "@/lib/api/middlewares";

export const POST = pipe(
  withSentry("/api/chat"),
  withCSRF,
)(async (ctx) => {
  const request = ctx.req;
  const log = getRequestLogger(request);
  const clientId = getClientIdentifier(request);
  const rateLimit = await checkRateLimitAsync(
    `chat:${clientId}`,
    RATE_LIMITS.CHAT,
  );

  if (!rateLimit.success) {
    log.warn("Rate limit exceeded", { clientId, endpoint: "/api/chat" });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body: ChatRequest = await request.json();
    const {
      messages,
      systemPrompt,
      maestroId,
      conversationId,
      enableTools = true,
      enableMemory = true,
      requestedTool,
      language = "it",
    } = body;

    if (!messages || !Array.isArray(messages)) {
      const response = NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }

    // Authentication + COPPA compliance check
    const coppaCheck = await extractUserIdWithCoppaCheck();
    if (!coppaCheck.allowed) {
      const response = NextResponse.json(
        {
          error: "Parental consent required",
          code: "COPPA_CONSENT_REQUIRED",
          message:
            "Users under 13 require parental consent to use AI features. Please ask a parent or guardian to provide consent.",
        },
        { status: 403 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }
    const userId = coppaCheck.userId;

    // Dependency Detection (Amodei 2026) - track session start
    // Detect new session: only 1 user message means this is the start
    const userMessages = messages.filter((m) => m.role === "user");
    if (userId && userMessages.length === 1) {
      recordSessionStart(userId).catch((err) => {
        log.debug("Session start tracking failed (non-blocking)", {
          error: String(err),
        });
      });
    }

    // Trial limit check for anonymous users (ADR 0056)
    const trialCheck = await checkTrialForAnonymous(!!userId, userId);
    if (!trialCheck.allowed) {
      const response = NextResponse.json(
        {
          error: "Trial limit reached",
          code: "TRIAL_LIMIT_REACHED",
          message:
            "Hai raggiunto il limite di chat gratuite. Richiedi un invito beta per continuare!",
          chatsRemaining: 0,
        },
        { status: 403 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }
    const trialSessionId = trialCheck.sessionId;

    // F-03: Check if trial session is blocked due to abuse
    if (trialSessionId && !userId) {
      // Adapter for anti-abuse db interface
      const dbAdapter = {
        session: {
          findUnique: (args: unknown) =>
            prisma.trialSession.findUnique(
              args as Parameters<typeof prisma.trialSession.findUnique>[0],
            ),
        },
      };
      const blocked = await isSessionBlocked(trialSessionId, dbAdapter);
      if (blocked) {
        log.warn("Trial session blocked for abuse", {
          sessionId: trialSessionId.slice(0, 8),
        });
        const response = NextResponse.json(
          {
            error:
              "Sessione bloccata per attività sospetta. Riprova tra 24 ore.",
            code: "TRIAL_ABUSE_BLOCKED",
          },
          { status: 429 },
        );
        response.headers.set("X-Request-ID", getRequestId(request));
        return response;
      }
    }

    // Load user settings and check budget
    let providerPreference: AIProvider | "auto" | undefined;
    const userSettings = userId ? await loadUserSettings(userId) : null;

    if (
      userSettings?.provider &&
      (userSettings.provider === "azure" || userSettings.provider === "ollama")
    ) {
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
      const toolContext =
        requestedTool === "demo"
          ? getDemoContext(maestroId)
          : TOOL_CONTEXT[requestedTool];
      if (toolContext) {
        enhancedSystemPrompt = `${systemPrompt}\n\n${toolContext}`;
        log.debug("Tool context injected", { requestedTool, maestroId });
      }
    }

    // Get last user message for safety filtering and RAG
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();

    // Build all contexts (memory, tool, RAG, adaptive, language)
    const contexts = await buildAllContexts({
      systemPrompt: enhancedSystemPrompt,
      userId,
      maestroId,
      conversationId,
      enableMemory,
      lastUserMessage: lastUserMessage?.content,
      adaptiveDifficultyMode: userSettings?.adaptiveDifficultyMode,
      requestedTool,
      language,
    });
    enhancedSystemPrompt = contexts.enhancedPrompt;

    // SECURITY: Normalize unicode and filter input
    if (lastUserMessage) {
      const { normalized, wasModified } = normalizeUnicode(
        lastUserMessage.content,
      );
      if (wasModified) {
        log.debug("Unicode normalized in user input", { clientId });
        lastUserMessage.content = normalized;
      }

      const filterResult = filterInput(lastUserMessage.content);
      if (!filterResult.safe && filterResult.action === "block") {
        log.warn("Content blocked by safety filter", {
          clientId,
          category: filterResult.category,
          severity: filterResult.severity,
        });
        recordContentFiltered(filterResult.category || "unknown", {
          userId,
          maestroId,
          actionTaken: "blocked",
        });
        const response = NextResponse.json({
          content: filterResult.suggestedResponse,
          provider: "safety_filter",
          model: "content-filter",
          blocked: true,
          category: filterResult.category,
        });
        response.headers.set("X-Request-ID", getRequestId(request));
        return response;
      }

      // STEM Safety Check (Amodei 2026) - block dangerous STEM queries
      if (maestroId) {
        const stemResult = checkSTEMSafety(lastUserMessage.content, maestroId);
        if (stemResult.blocked) {
          log.warn("STEM safety filter triggered", {
            clientId,
            subject: stemResult.subject,
            category: stemResult.category,
          });
          recordContentFiltered("stem_safety", {
            userId,
            maestroId,
            actionTaken: "blocked",
          });
          const response = NextResponse.json({
            content: stemResult.safeResponse,
            provider: "safety_filter",
            model: "stem-safety",
            blocked: true,
            category: `stem_${stemResult.category}`,
            alternatives: stemResult.alternatives,
          });
          response.headers.set("X-Request-ID", getRequestId(request));
          return response;
        }
      }

      // Dependency Detection (Amodei 2026) - track usage patterns
      if (userId) {
        recordMessage(userId, lastUserMessage.content).catch((err) => {
          log.debug("Dependency tracking failed (non-blocking)", {
            error: String(err),
          });
        });
      }

      // Independence Gamification (Amodei 2026) - reward human connections
      if (userId) {
        const independence = analyzeIndependence(lastUserMessage.content);
        if (independence.xpToAward > 0) {
          awardPoints(
            userId,
            independence.xpToAward,
            "independence_behavior",
            undefined,
            "IndependenceTracker",
          ).catch((err) => {
            log.debug("Independence XP award failed (non-blocking)", {
              error: String(err),
            });
          });
          log.info("Independence behavior detected", {
            userId,
            xp: independence.xpToAward,
            patterns: independence.detectedPatterns,
          });
        }
      }
    }

    // Tier-based model selection: Get appropriate model for user's tier (ADR 0073)
    const tierModel = await tierService.getModelForUserFeature(
      userId ?? null,
      "chat",
    );
    const deploymentName = getDeploymentForModel(tierModel);

    log.debug("Tier-based model selected", {
      userId: userId || "anonymous",
      tierModel,
      deploymentName,
    });

    const providerConfig = getActiveProvider(
      providerPreference,
      deploymentName,
    );

    try {
      if (requestedTool) {
        log.info("Tool mode active", {
          requestedTool,
          toolsEnabled: enableTools,
          hasToolContext: !!TOOL_CONTEXT[requestedTool],
          maestroId,
        });
      }

      const toolChoice = buildToolChoice(enableTools, requestedTool);

      const result = await chatCompletion(messages, enhancedSystemPrompt, {
        tools: enableTools
          ? ([
              ...CHAT_TOOL_DEFINITIONS,
            ] as (typeof CHAT_TOOL_DEFINITIONS)[number][])
          : undefined,
        tool_choice: toolChoice,
        providerPreference,
        model: deploymentName, // Tier-based model routing
      });

      log.debug("Chat response", {
        hasToolCalls: !!(result.tool_calls && result.tool_calls.length > 0),
        toolCallCount: result.tool_calls?.length || 0,
        toolCallNames: result.tool_calls?.map((tc) => tc.function.name) || [],
        contentLength: result.content?.length || 0,
      });

      // Handle tool calls
      if (result.tool_calls && result.tool_calls.length > 0) {
        // Check trial tool limits for anonymous users
        if (trialSessionId && !userId) {
          const toolLimitCheck = await checkTrialToolLimit(trialSessionId);
          if (!toolLimitCheck.allowed) {
            if (toolLimitCheck.reason === "Trial email verification required") {
              const response = NextResponse.json(
                {
                  error: "Email verification required",
                  code: "TRIAL_EMAIL_VERIFICATION_REQUIRED",
                  message:
                    "Verifica la tua email per continuare a usare gli strumenti della prova.",
                  sessionId: trialSessionId,
                },
                { status: 403 },
              );
              response.headers.set("X-Request-ID", getRequestId(request));
              return response;
            }
            const response = NextResponse.json(
              {
                error: "Trial tool limit reached",
                code: "TRIAL_TOOL_LIMIT_REACHED",
                message:
                  "Hai raggiunto il limite di strumenti gratuiti. Richiedi un invito beta per continuare!",
                toolsRemaining: 0,
              },
              { status: 403 },
            );
            response.headers.set("X-Request-ID", getRequestId(request));
            return response;
          }
        }

        const toolCallRefs = await processToolCalls(result.tool_calls, {
          maestroId,
          conversationId,
          userId,
        });

        // Track tool usage for trial users
        if (trialSessionId && !userId) {
          for (const toolRef of toolCallRefs) {
            if (toolRef.status === "completed") {
              await incrementTrialToolUsage(trialSessionId);
            }
          }
        }

        const response = NextResponse.json({
          content: result.content || "",
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          maestroId,
          toolCalls: toolCallRefs,
          hasTools: true,
          hasMemory: contexts.hasMemory,
          hasToolContext: contexts.hasToolContext,
          hasRAG: contexts.hasRAG,
          // Trial info for tool usage
          trial: trialSessionId
            ? {
                toolsRemaining: Math.max(
                  0,
                  (trialCheck.toolsRemaining ?? 10) -
                    toolCallRefs.filter((t) => t.status === "completed").length,
                ),
              }
            : undefined,
        });
        response.headers.set("X-Request-ID", getRequestId(request));
        return response;
      }

      // Sanitize output
      const sanitized = sanitizeOutput(result.content);
      if (sanitized.modified) {
        log.warn("Output sanitized", {
          clientId,
          issuesFound: sanitized.issuesFound,
          categories: sanitized.categories,
        });
      }

      // Transparency assessment
      const transparencyContext: TransparencyContext = {
        response: sanitized.text,
        query: lastUserMessage?.content || "",
        ragResults: contexts.ragResultsForTransparency,
        usedKnowledgeBase: !!maestroId,
        maestroId,
      };
      const transparency = assessResponseTransparency(transparencyContext);

      // Update budget
      if (userId && userSettings && result.usage) {
        await updateBudget(
          userId,
          result.usage.total_tokens || 0,
          userSettings.totalSpent,
        );
      }

      // Increment trial usage and budget for anonymous users (ADR 0056, F-06)
      if (trialSessionId && !userId) {
        await incrementTrialUsage(trialSessionId);

        // Also increment trial budget to track cumulative cost (F-06: admin counts push)
        if (result.usage?.total_tokens) {
          const estimatedCost = result.usage.total_tokens * TOKEN_COST_PER_UNIT;
          incrementTrialBudgetWithPublish(estimatedCost).catch((err) => {
            log.debug("Trial budget publish failed (non-blocking)", {
              error: String(err),
              cost: estimatedCost,
            });
          });
        }
      }

      const response = NextResponse.json({
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
          hasHallucinations:
            transparency.hallucinationRisk.indicators.length > 0,
          needsCitation: transparency.hallucinationRisk.indicators.some(
            (h: { type: string }) => h.type === "factual_claim",
          ),
        },
        // Trial info for anonymous users (ADR 0056)
        trial: trialSessionId
          ? {
              chatsRemaining: Math.max(
                0,
                (trialCheck.chatsRemaining ?? 10) - 1,
              ),
            }
          : undefined,
      });
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    } catch (providerError) {
      const errorMessage =
        providerError instanceof Error
          ? providerError.message
          : "Unknown provider error";

      if (errorMessage.includes("Ollama is not running")) {
        const response = NextResponse.json(
          {
            error: "No AI provider available",
            message: errorMessage,
            help: "Configure Azure OpenAI or start Ollama: ollama serve && ollama pull llama3.2",
            provider: providerConfig?.provider ?? "none",
          },
          { status: 503 },
        );
        response.headers.set("X-Request-ID", getRequestId(request));
        return response;
      }

      const response = NextResponse.json(
        {
          error: "Chat request failed",
          message: errorMessage,
          provider: providerConfig?.provider ?? "unknown",
        },
        { status: 500 },
      );
      response.headers.set("X-Request-ID", getRequestId(request));
      return response;
    }
  } catch (error) {
    log.error("Chat API error", { error: String(error) });
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    response.headers.set("X-Request-ID", getRequestId(request));
    return response;
  }
});

export const GET = pipe(withSentry("/api/chat"))(async (ctx) => {
  const provider = getActiveProvider();

  if (!provider) {
    const response = NextResponse.json({
      available: false,
      provider: null,
      message: "No AI provider configured",
    });
    response.headers.set("X-Request-ID", getRequestId(ctx.req));
    return response;
  }

  const response = NextResponse.json({
    available: true,
    provider: provider.provider,
    model: provider.model,
  });
  response.headers.set("X-Request-ID", getRequestId(ctx.req));
  return response;
});
