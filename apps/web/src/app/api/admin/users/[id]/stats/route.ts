import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';

export const revalidate = 0;

export const GET = pipe(
  withSentry('/api/admin/users/[id]/stats'),
  withAdminReadOnly,
)(async (ctx) => {
  const params = await ctx.params;
  const userId = params.id;

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      disabled: true,
      createdAt: true,
      updatedAt: true,
      subscription: {
        select: {
          tier: { select: { code: true, name: true } },
          status: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalConversations,
    recentConversations,
    conversationsByMaestro,
    totalMessages,
    totalFlashcards,
    totalMaterials,
    sessionMetrics,
    settings,
  ] = await Promise.all([
    prisma.conversation.count({ where: { userId } }),
    prisma.conversation.count({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.conversation.groupBy({
      by: ['maestroId'],
      where: { userId },
      _count: true,
      orderBy: { _count: { maestroId: 'desc' } },
      take: 5,
    }),
    prisma.message.count({
      where: { conversation: { userId } },
    }),
    prisma.flashcardProgress.count({ where: { userId } }),
    prisma.material.count({ where: { userId } }),
    prisma.sessionMetrics.aggregate({
      where: { userId },
      _sum: { voiceMinutes: true, tokensIn: true, tokensOut: true },
      _count: true,
    }),
    prisma.settings.findUnique({
      where: { userId },
      select: { language: true, theme: true },
    }),
  ]);

  const lastActivity = await prisma.conversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });

  return NextResponse.json({
    user: {
      ...user,
      lastActivity: lastActivity?.updatedAt || user.updatedAt,
    },
    stats: {
      conversations: {
        total: totalConversations,
        last30Days: recentConversations,
      },
      messages: totalMessages,
      flashcards: {
        total: totalFlashcards,
        reviewed: sessionMetrics._count || 0,
      },
      materials: totalMaterials,
      voiceMinutes: Math.round(sessionMetrics._sum.voiceMinutes || 0),
      topMaestri: conversationsByMaestro.map((m: { maestroId: string | null; _count: number }) => ({
        maestroId: m.maestroId || 'unknown',
        sessions: m._count,
      })),
    },
    settings: settings || { language: 'it', theme: 'system' },
  });
});
