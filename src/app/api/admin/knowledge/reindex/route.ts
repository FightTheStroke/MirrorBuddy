import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "admin-knowledge-reindex" });

export const POST = pipe(
  withSentry("/api/admin/knowledge/reindex"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { maestroId } = await ctx.req.json();
  if (!maestroId || typeof maestroId !== "string") {
    return NextResponse.json(
      { error: "maestroId is required" },
      { status: 400 },
    );
  }

  // Delete existing embeddings for this maestro
  const deleted = await prisma.contentEmbedding.deleteMany({
    where: { sourceId: maestroId },
  });

  log.info("Cleared embeddings for reindex", {
    maestroId,
    deletedCount: deleted.count,
  });

  // Note: actual re-embedding happens via the RAG pipeline
  // when the maestro is next used in a conversation.
  // This endpoint just clears stale embeddings.

  return NextResponse.json({
    success: true,
    maestroId,
    deletedCount: deleted.count,
    message: "Embeddings cleared. Re-indexing will occur on next use.",
  });
});
