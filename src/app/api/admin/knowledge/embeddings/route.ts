import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";

export const GET = pipe(
  withSentry("/api/admin/knowledge/embeddings"),
  withAdmin,
)(async () => {
  const counts = await prisma.contentEmbedding.groupBy({
    by: ["sourceType"],
    _count: true,
    _sum: { tokenCount: true },
  });

  const totalEmbeddings = await prisma.contentEmbedding.count();

  return NextResponse.json({
    total: totalEmbeddings,
    bySourceType: counts.map((c) => ({
      sourceType: c.sourceType,
      count: c._count,
      totalTokens: c._sum.tokenCount ?? 0,
    })),
  });
});
