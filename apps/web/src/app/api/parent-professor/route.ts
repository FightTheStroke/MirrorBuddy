// ============================================================================
// API ROUTE: Parent-Professor Conversations (Issue #63)
// POST: Create parent mode conversation with a Maestro
// GET: List parent conversations
// Supports per-feature model selection (ADR 0073)
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  chatCompletion,
  getActiveProvider,
  getDeploymentForModel,
  generateParentModePrompt,
  getParentModeGreeting,
} from "@/lib/ai/server";
import { tierService } from "@/lib/tier/server";
import { filterInput, sanitizeOutput } from "@/lib/safety";
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  getOrCreateParentConversation,
  addConversationMessage,
  updateConversationMetadata,
  getStudentLearnings,
  formatConversationResponse,
} from "./helpers";
import type { ParentChatRequest } from "./types";


export const revalidate = 0;
export const POST = pipe(
  withSentry("/api/parent-professor"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  // Rate limiting
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(`parent-chat:${clientId}`, RATE_LIMITS.CHAT);

  if (!rateLimit.success) {
    logger.warn("Rate limit exceeded", {
      clientId,
      endpoint: "/api/parent-professor",
    });
    return rateLimitResponse(rateLimit);
  }

  const body: ParentChatRequest = await ctx.req.json();
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
      {
        error: "maestroId, studentId, studentName, and message are required",
      },
      { status: 400 },
    );
  }

  // Safety filter on parent message
  const filterResult = filterInput(message);
  if (!filterResult.safe && filterResult.action === "block") {
    logger.warn("Parent content blocked", {
      clientId,
      category: filterResult.category,
    });
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
    studentName,
  );

  // Get or create conversation
  const convResult = await getOrCreateParentConversation(
    conversationId,
    userId,
    maestroId,
    maestroDisplayName,
    studentId,
    studentName,
  );

  if (!convResult.success) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const { conversation, isNew } = convResult;
  if (!conversation) {
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
  const messages: Array<{ role: string; content: string }> =
    convResult.messages || [];

  // Add greeting if new conversation
  if (isNew) {
    const greeting = getParentModeGreeting(
      maestroDisplayName,
      studentName,
      learnings.length > 0,
    );
    await addConversationMessage(conversation.id, "assistant", greeting);
    messages.push({ role: "assistant", content: greeting });
  }

  // Add user message to database
  await addConversationMessage(conversation.id, "user", message);

  // Add to messages for AI call
  messages.push({ role: "user", content: message });

  // Get AI response
  const providerConfig = getActiveProvider();
  if (!providerConfig) {
    return NextResponse.json(
      { error: "No AI provider available" },
      { status: 503 },
    );
  }

  // Get tier-based model for chat feature (ADR 0073)
  const tierModel = await tierService.getModelForUserFeature(userId, "chat");
  const deploymentName = getDeploymentForModel(tierModel);

  const result = await chatCompletion(
    messages.map((m) => ({
      ...m,
      role: m.role as "user" | "assistant" | "system",
    })),
    parentModePrompt,
    { tool_choice: "none", model: deploymentName }, // No tools in parent mode
  );

  // Sanitize output
  const sanitized = sanitizeOutput(result.content);

  // Save assistant response to database
  await addConversationMessage(conversation.id, "assistant", sanitized.text);

  // Update conversation metadata
  await updateConversationMetadata(conversation.id, 2);

  logger.info("Parent-professor conversation", {
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
});

// GET: List parent conversations
export const GET = pipe(
  withSentry("/api/parent-professor"),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;

  const { searchParams } = new URL(ctx.req.url);
  const studentId = searchParams.get("studentId");
  const limit = parseInt(searchParams.get("limit") || "20");

  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      isParentMode: true,
      ...(studentId && { studentId }),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json(conversations.map(formatConversationResponse));
});
