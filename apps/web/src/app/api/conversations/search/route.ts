import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry } from "@/lib/api/middlewares";

// NOTE: This route does NOT require auth - public search endpoint

export const revalidate = 0;
export const GET = pipe(withSentry("/api/conversations/search"))(async (
  ctx,
) => {
  const { searchParams } = new URL(ctx.req.url);
  const maestroId = searchParams.get("maestroId");
  const query = searchParams.get("q");
  const dateFrom = searchParams.get("dateFrom");

  if (!maestroId) {
    return NextResponse.json(
      { error: "maestroId is required" },
      { status: 400 },
    );
  }

  const where: {
    maestroId: string;
    OR?: {
      title?: { contains: string; mode: "insensitive" };
      messages?: {
        some: { content: { contains: string; mode: "insensitive" } };
      };
    }[];
    createdAt?: { gte: Date };
  } = { maestroId };

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      {
        messages: {
          some: { content: { contains: query, mode: "insensitive" } },
        },
      },
    ];
  }

  if (dateFrom) {
    where.createdAt = { gte: new Date(dateFrom) };
  }

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { content: true },
      },
    },
  });

  const result = conversations.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    lastMessageAt: c.updatedAt,
    messageCount: c._count.messages,
    preview: c.messages[0]?.content?.slice(0, 100) || null,
  }));

  return NextResponse.json(result);
});
