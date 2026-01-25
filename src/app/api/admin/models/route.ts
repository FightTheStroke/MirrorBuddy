/**
 * API ROUTE: Model Catalog for admin tier configuration
 * GET: List all available models with metadata
 */

import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const auth = await validateAuth();

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminCheck = await requireAdmin(auth.userId);
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const models = await prisma.modelCatalog.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { qualityScore: "desc" }],
      select: {
        id: true,
        name: true,
        displayName: true,
        provider: true,
        category: true,
        inputCostPer1k: true,
        outputCostPer1k: true,
        maxTokens: true,
        contextWindow: true,
        supportsVision: true,
        supportsTools: true,
        supportsJson: true,
        qualityScore: true,
        speedScore: true,
        educationScore: true,
        recommendedFor: true,
        notRecommendedFor: true,
      },
    });

    // Convert Decimal to number for JSON serialization
    const serializedModels = models.map((m) => ({
      ...m,
      inputCostPer1k: Number(m.inputCostPer1k),
      outputCostPer1k: Number(m.outputCostPer1k),
    }));

    return NextResponse.json(serializedModels);
  } catch (error) {
    logger.error("Error fetching model catalog", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 },
    );
  }
}
