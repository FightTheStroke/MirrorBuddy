/**
 * Funnel Users API
 * Lists users/visitors with stage filtering
 * Plan 069 - Conversion Funnel Dashboard
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { FUNNEL_STAGES } from '@/lib/funnel/constants';

const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20),
  stage: z.enum(FUNNEL_STAGES).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
  search: z.string().max(200).optional(),
});

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

export const revalidate = 0;

interface FunnelUser {
  id: string; // visitorId or userId
  type: 'visitor' | 'user';
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
    days: number | null;
  };
}

export const GET = pipe(
  withSentry('/api/admin/funnel/users'),
  withAdminReadOnly,
)(async (ctx) => {
  const url = new URL(ctx.req.url);
  const validation = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid funnel filters' }, { status: 400 });
  }
  const { page, stage = null, search = null, days } = validation.data;
  const pageSize = Math.min(100, validation.data.pageSize);
  const since = days === undefined ? null : new Date();
  if (since && days !== undefined) since.setDate(since.getDate() - days);

  const latestEvents = await prisma.$queryRaw<LatestEventResult[]>(Prisma.sql`
    SELECT * FROM (
      SELECT DISTINCT ON (COALESCE("userId", "visitorId"))
        "visitorId", "userId", "stage", "createdAt"
      FROM "FunnelEvent"
      WHERE "isTestData" = false
      ${since ? Prisma.sql`AND "createdAt" >= ${since}` : Prisma.empty}
      ORDER BY COALESCE("userId", "visitorId"), "createdAt" DESC
    ) AS latest
    ${stage ? Prisma.sql`WHERE "stage" = ${stage}` : Prisma.empty}
  `);

  // Get event counts per user
  const eventCounts = await prisma.funnelEvent.groupBy({
    by: ['visitorId', 'userId'],
    where: { isTestData: false, ...(since && { createdAt: { gte: since } }) },
    _count: { _all: true },
  });
  const countMap = new Map(
    eventCounts.map((e: EventCountResult) => [e.userId ?? e.visitorId, e._count._all]),
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
  const emailMap = new Map(trialSessions.map((t: TrialSessionResult) => [t.visitorId, t.email]));

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
      const id = e.userId ?? e.visitorId ?? '';
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
  const paginatedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  const funnelUsers: FunnelUser[] = paginatedEvents.map((e: LatestEventResult) => {
    const id = e.userId ?? e.visitorId ?? 'unknown';
    const isUser = !!e.userId;
    const email = isUser
      ? (userEmailMap.get(e.userId!) ?? null)
      : e.visitorId
        ? (emailMap.get(e.visitorId) ?? null)
        : null;

    return {
      id,
      type: isUser ? 'user' : 'visitor',
      email,
      currentStage: e.stage,
      stageEnteredAt: e.createdAt.toISOString(),
      eventsCount: countMap.get(id) ?? 0,
      lastActivity: e.createdAt.toISOString(),
    };
  });

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
      days: days ?? null,
    },
  };

  return NextResponse.json(response);
});
