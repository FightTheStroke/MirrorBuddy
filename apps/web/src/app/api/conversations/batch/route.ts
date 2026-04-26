import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pipe, withSentry, withAuth, withCSRF } from "@/lib/api/middlewares";


export const revalidate = 0;
export const DELETE = pipe(
  withSentry("/api/conversations/batch"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const body = await ctx.req.json();
  const { ids } = body as { ids: string[] };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "ids array is required" },
      { status: 400 },
    );
  }

  // Delete messages first (due to foreign key constraints)
  await prisma.message.deleteMany({
    where: { conversationId: { in: ids } },
  });

  // Delete conversations
  const result = await prisma.conversation.deleteMany({
    where: { id: { in: ids } },
  });

  return NextResponse.json({ deleted: result.count });
});
