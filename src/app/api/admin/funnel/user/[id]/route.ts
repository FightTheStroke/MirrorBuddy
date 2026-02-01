/**
 * User Funnel Drill-down API
 * Returns complete journey for a single user/visitor
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";

export const dynamic = "force-dynamic";

interface FunnelEventItem {
  stage: string;
  fromStage: string | null;
  createdAt: string;
  metadata: unknown;
}

interface UsageMetrics {
  chatsUsed: number;
  voiceSecondsUsed: number;
  toolsUsed: number;
  docsUsed: number;
}

interface UserDrilldownResponse {
  id: string;
  type: "visitor" | "user";
  email: string | null;
  currentStage: string;
  journey: FunnelEventItem[];
  usage: UsageMetrics;
  inviteRequest: {
    id: string;
    status: string;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
  trialSession: {
    id: string;
    createdAt: string;
    lastActivityAt: string;
    assignedMaestri: string[];
    assignedCoach: string | null;
  } | null;
  userAccount: {
    id: string;
    email: string;
    createdAt: string;
    lastLoginAt: string | null;
  } | null;
}

export const GET = pipe(
  withSentry("/api/admin/funnel/user/[id]"),
  withAdmin,
)(async (ctx) => {
  const { id } = await ctx.params;
  // Determine if this is a userId or visitorId
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, createdAt: true },
  });

  const isUser = !!user;

  // Get funnel journey
  const journey = await prisma.funnelEvent.findMany({
    where: isUser
      ? { userId: id, isTestData: false }
      : { visitorId: id, isTestData: false },
    orderBy: { createdAt: "asc" },
    select: {
      stage: true,
      fromStage: true,
      createdAt: true,
      metadata: true,
    },
  });

  if (journey.length === 0) {
    return NextResponse.json(
      { error: "User not found in funnel" },
      { status: 404 },
    );
  }

  const currentStage = journey[journey.length - 1].stage;

  // Get trial session data
  const trialSession = await prisma.trialSession.findFirst({
    where: { visitorId: id },
    select: {
      id: true,
      email: true,
      chatsUsed: true,
      voiceSecondsUsed: true,
      toolsUsed: true,
      docsUsed: true,
      assignedMaestri: true,
      assignedCoach: true,
      createdAt: true,
      lastActivityAt: true,
    },
  });

  // Get invite request if exists
  const inviteRequest = await prisma.inviteRequest.findFirst({
    where: isUser
      ? { email: user?.email ?? undefined }
      : { trialSessionId: trialSession?.id },
    select: {
      id: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
    },
  });

  // Build usage metrics
  const usage: UsageMetrics = {
    chatsUsed: trialSession?.chatsUsed ?? 0,
    voiceSecondsUsed: trialSession?.voiceSecondsUsed ?? 0,
    toolsUsed: trialSession?.toolsUsed ?? 0,
    docsUsed: trialSession?.docsUsed ?? 0,
  };

  const response: UserDrilldownResponse = {
    id,
    type: isUser ? "user" : "visitor",
    email: user?.email ?? trialSession?.email ?? null,
    currentStage,
    journey: journey.map((e) => ({
      stage: e.stage,
      fromStage: e.fromStage,
      createdAt: e.createdAt.toISOString(),
      metadata: e.metadata,
    })),
    usage,
    inviteRequest: inviteRequest
      ? {
          id: inviteRequest.id,
          status: inviteRequest.status,
          createdAt: inviteRequest.createdAt.toISOString(),
          reviewedAt: inviteRequest.reviewedAt?.toISOString() ?? null,
        }
      : null,
    trialSession: trialSession
      ? {
          id: trialSession.id,
          createdAt: trialSession.createdAt.toISOString(),
          lastActivityAt: trialSession.lastActivityAt.toISOString(),
          assignedMaestri: JSON.parse(trialSession.assignedMaestri || "[]"),
          assignedCoach: trialSession.assignedCoach,
        }
      : null,
    userAccount: user
      ? {
          id: user.id,
          email: user.email ?? "",
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: null, // Would need Session table lookup
        }
      : null,
  };

  return NextResponse.json(response);
});
