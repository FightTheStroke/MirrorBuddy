import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "admin-knowledge-embeddings" });

export async function GET() {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("Failed to fetch embedding stats", { error: msg });
    return NextResponse.json(
      { error: `Failed to fetch embeddings: ${msg}` },
      { status: 500 },
    );
  }
}
