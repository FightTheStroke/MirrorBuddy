/**
 * Funnel Users API
 * Lists users/visitors with stage filtering
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { FunnelStage } from "@/lib/funnel/constants";

// Types for Prisma query results
interface EventCountResult {
  visitorId: string | null;
  userId: string | null;
  _count: { _all: number };
}

interface LatestEventResult {
  visitorId: string | null;
  userId: string | null;
  stage: string;
  createdAt: Date;
}

interface TrialSessionResult {
  visitorId: string;
  email: string | null;
}

interface UserResult {
  id: string;
  email: string | null;
}

export const dynamic = "force-dynamic";

interface FunnelUser {
  id: string; // visitorId or userId
  type: "visitor" | "user";
  email: string | null;
  currentStage: string;
  stageEnteredAt: string;
  eventsCount: number;
  lastActivity: string;
}

interface FunnelUsersResponse {
  users: FunnelUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    stage: string | null;
    search: string | null;
  };
}

export async function GET(request: Request) {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")),
  );
  const stage = url.searchParams.get("stage") as FunnelStage | null;
  const search = url.searchParams.get("search");

  try {
    // Get latest event per user/visitor to determine current stage
    // Using raw query for performance with DISTINCT ON
    const latestEventsQuery = stage
      ? `SELECT DISTINCT ON (COALESCE("userId", "visitorId"))
           "visitorId", "userId", "stage", "createdAt"
         FROM "FunnelEvent"
         WHERE "isTestData" = false AND "stage" = $1
         ORDER BY COALESCE("userId", "visitorId"), "createdAt" DESC`
      : `SELECT DISTINCT ON (COALESCE("userId", "visitorId"))
           "visitorId", "userId", "stage", "createdAt"
         FROM "FunnelEvent"
         WHERE "isTestData" = false
         ORDER BY COALESCE("userId", "visitorId"), "createdAt" DESC`;

    const latestEvents = await prisma.$queryRawUnsafe<
      Array<{
        visitorId: string | null;
        userId: string | null;
        stage: string;
        createdAt: Date;
      }>
    >(latestEventsQuery, ...(stage ? [stage] : []));

    // Get event counts per user
    const eventCounts = await prisma.funnelEvent.groupBy({
      by: ["visitorId", "userId"],
      where: { isTestData: false },
      _count: { _all: true },
    });
    const countMap = new Map(
      eventCounts.map((e: EventCountResult) => [
        e.userId ?? e.visitorId,
        e._count._all,
      ]),
    );

    // Get trial session emails for visitors
    const visitorIds = latestEvents
      .filter((e: LatestEventResult) => e.visitorId && !e.userId)
      .map((e: LatestEventResult) => e.visitorId!);

    const trialSessions =
      visitorIds.length > 0
        ? await prisma.trialSession.findMany({
            where: { visitorId: { in: visitorIds } },
            select: { visitorId: true, email: true },
          })
        : [];
    const emailMap = new Map(
      trialSessions.map((t: TrialSessionResult) => [t.visitorId, t.email]),
    );

    // Get user emails
    const userIds = latestEvents
      .filter((e: LatestEventResult) => e.userId)
      .map((e: LatestEventResult) => e.userId!);

    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true },
          })
        : [];
    const userEmailMap = new Map(users.map((u: UserResult) => [u.id, u.email]));

    // Build response with filtering
    let filteredEvents = latestEvents;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredEvents = filteredEvents.filter((e: LatestEventResult) => {
        const id = e.userId ?? e.visitorId ?? "";
        const email = e.userId
          ? userEmailMap.get(e.userId)
          : e.visitorId
            ? emailMap.get(e.visitorId)
            : null;
        return (
          id.toLowerCase().includes(searchLower) ||
          (email?.toLowerCase().includes(searchLower) ?? false)
        );
      });
    }

    const total = filteredEvents.length;
    const paginatedEvents = filteredEvents.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );

    const funnelUsers: FunnelUser[] = paginatedEvents.map(
      (e: LatestEventResult) => {
        const id = e.userId ?? e.visitorId ?? "unknown";
        const isUser = !!e.userId;
        const email = isUser
          ? (userEmailMap.get(e.userId!) ?? null)
          : e.visitorId
            ? (emailMap.get(e.visitorId) ?? null)
            : null;

        return {
          id,
          type: isUser ? "user" : "visitor",
          email,
          currentStage: e.stage,
          stageEnteredAt: e.createdAt.toISOString(),
          eventsCount: countMap.get(id) ?? 0,
          lastActivity: e.createdAt.toISOString(),
        };
      },
    );

    const response: FunnelUsersResponse = {
      users: funnelUsers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      filters: {
        stage,
        search,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[funnel/users] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
