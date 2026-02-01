/**
 * API ROUTE: Model Catalog for admin tier configuration
 * GET: List all available models with metadata
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";

export const GET = pipe(
  withSentry("/api/admin/models"),
  withAdmin,
)(async (_ctx) => {
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
});
