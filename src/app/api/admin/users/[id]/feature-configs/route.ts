/**
 * Admin API for user-level feature AI config overrides (ADR 0073)
 *
 * GET - List all feature configs for a user
 * POST - Set/update a feature config for a user
 * DELETE - Remove a feature config override
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { tierService } from "@/lib/tier";
import type { FeatureType, UserFeatureConfigInput } from "@/lib/tier";

const VALID_FEATURES: FeatureType[] = [
  "chat",
  "realtime",
  "pdf",
  "mindmap",
  "quiz",
  "flashcards",
  "summary",
  "formula",
  "chart",
  "homework",
  "webcam",
  "demo",
];

/**
 * GET /api/admin/users/[id]/feature-configs
 * List all feature config overrides for a user
 */
export const GET = pipe(
  withSentry("/api/admin/users/[id]/feature-configs"),
  withAdmin,
)(async (ctx) => {
  const { id: userId } = await ctx.params;
  const configs = await tierService.getUserFeatureConfigs(userId);

  return NextResponse.json({ configs });
});

/**
 * POST /api/admin/users/[id]/feature-configs
 * Set or update a feature config override
 *
 * Body:
 * - feature: FeatureType (required)
 * - model?: string | null
 * - temperature?: number | null
 * - maxTokens?: number | null
 * - isEnabled?: boolean | null
 * - reason?: string
 * - expiresAt?: string (ISO date)
 */
export const POST = pipe(
  withSentry("/api/admin/users/[id]/feature-configs"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { id: userId } = await ctx.params;
  const body = await ctx.req.json();

  // Validate required fields
  if (!body.feature) {
    return NextResponse.json({ error: "Feature is required" }, { status: 400 });
  }

  // Validate feature type
  if (!VALID_FEATURES.includes(body.feature)) {
    return NextResponse.json(
      {
        error: `Invalid feature. Valid values: ${VALID_FEATURES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Validate temperature if provided
  if (body.temperature !== undefined && body.temperature !== null) {
    const temp = Number(body.temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      return NextResponse.json(
        { error: "Temperature must be between 0 and 2" },
        { status: 400 },
      );
    }
  }

  // Validate maxTokens if provided
  if (body.maxTokens !== undefined && body.maxTokens !== null) {
    const tokens = Number(body.maxTokens);
    if (isNaN(tokens) || tokens < 1 || tokens > 128000) {
      return NextResponse.json(
        { error: "Max tokens must be between 1 and 128000" },
        { status: 400 },
      );
    }
  }

  const input: UserFeatureConfigInput = {
    feature: body.feature as FeatureType,
    model: body.model,
    temperature:
      body.temperature !== undefined ? Number(body.temperature) : undefined,
    maxTokens:
      body.maxTokens !== undefined ? Number(body.maxTokens) : undefined,
    isEnabled: body.isEnabled,
    reason: body.reason,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
  };

  const config = await tierService.setUserFeatureConfig(
    userId,
    input,
    ctx.userId || "unknown",
  );

  return NextResponse.json({ success: true, config }, { status: 200 });
});

/**
 * DELETE /api/admin/users/[id]/feature-configs
 * Remove a feature config override
 *
 * Body:
 * - feature: FeatureType (required)
 */
export const DELETE = pipe(
  withSentry("/api/admin/users/[id]/feature-configs"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { id: userId } = await ctx.params;
  const body = await ctx.req.json();

  // Validate required fields
  if (!body.feature) {
    return NextResponse.json({ error: "Feature is required" }, { status: 400 });
  }

  // Validate feature type
  if (!VALID_FEATURES.includes(body.feature)) {
    return NextResponse.json(
      {
        error: `Invalid feature. Valid values: ${VALID_FEATURES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  await tierService.deleteUserFeatureConfig(
    userId,
    body.feature as FeatureType,
    ctx.userId || "unknown",
  );

  return NextResponse.json({ success: true }, { status: 200 });
});
