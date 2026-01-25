/**
 * Admin API for user-level feature AI config overrides (ADR 0073)
 *
 * GET - List all feature configs for a user
 * POST - Set/update a feature config for a user
 * DELETE - Remove a feature config override
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { tierService } from "@/lib/tier/tier-service";
import type { FeatureType, UserFeatureConfigInput } from "@/lib/tier/types";
import { logger } from "@/lib/logger";

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

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/admin/users/[userId]/feature-configs
 * List all feature config overrides for a user
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const configs = await tierService.getUserFeatureConfigs(userId);

    return NextResponse.json({ configs });
  } catch (error) {
    logger.error("Error fetching user feature configs", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch user feature configs" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/users/[userId]/feature-configs
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
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.feature) {
      return NextResponse.json(
        { error: "Feature is required" },
        { status: 400 },
      );
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
      auth.userId || "unknown",
    );

    return NextResponse.json({ success: true, config }, { status: 200 });
  } catch (error) {
    logger.error("Error setting user feature config", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to set user feature config" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/users/[userId]/feature-configs
 * Remove a feature config override
 *
 * Body:
 * - feature: FeatureType (required)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.feature) {
      return NextResponse.json(
        { error: "Feature is required" },
        { status: 400 },
      );
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
      auth.userId || "unknown",
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Error deleting user feature config", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete user feature config" },
      { status: 500 },
    );
  }
}
