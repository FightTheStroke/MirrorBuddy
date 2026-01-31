import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "admin-knowledge-reindex" });

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { maestroId } = await request.json();
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    log.error("Failed to reindex", { error: msg });
    return NextResponse.json(
      { error: `Failed to reindex: ${msg}` },
      { status: 500 },
    );
  }
}
