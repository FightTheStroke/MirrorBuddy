/**
 * IMAGE ANALYZE API
 * Generic image analysis using Azure OpenAI Vision
 * Reuses analyzeImageWithVision from webcam-handler
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF } from "@/lib/api/middlewares";
import { getActiveProvider } from "@/lib/ai/providers";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { analyzeImageWithVision } from "@/lib/tools/handlers/webcam-handler";
import { extractUserIdWithCoppaCheck } from "@/app/api/chat/auth-handler";

export const POST = pipe(
  withSentry("/api/image/analyze"),
  withCSRF,
)(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimit = checkRateLimit(
    `image-analyze:${clientId}`,
    RATE_LIMITS.HOMEWORK,
  );

  if (!rateLimit.success) {
    logger.warn("Rate limit exceeded", {
      clientId,
      endpoint: "/api/image/analyze",
    });
    return rateLimitResponse(rateLimit);
  }

  const { imageBase64 } = await ctx.req.json();

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json(
      { error: "imageBase64 is required" },
      { status: 400 },
    );
  }

  const provider = getActiveProvider();
  if (!provider || provider.provider !== "azure") {
    return NextResponse.json(
      { error: "Vision analysis requires Azure OpenAI" },
      { status: 501 },
    );
  }

  try {
    const coppaCheck = await extractUserIdWithCoppaCheck();
    const userId = coppaCheck.allowed ? coppaCheck.userId : undefined;

    const analysis = await analyzeImageWithVision(imageBase64, userId);

    return NextResponse.json({
      text: analysis.text,
      description: analysis.description,
    });
  } catch (error) {
    logger.error("[Image Analyze] Vision API error", { clientId }, error);
    return NextResponse.json(
      { error: "Image analysis failed" },
      { status: 500 },
    );
  }
});
