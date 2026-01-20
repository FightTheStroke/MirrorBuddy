/**
 * API Route: Onboarding State
 *
 * GET: Fetch existing onboarding state and profile data
 * POST: Save onboarding state and sync to profile
 *
 * Issue #73: Load existing user data for returning users
 */

import { NextResponse } from "next/server";
import { apiHandler, createHandler } from "@/lib/api";
import { logger } from "@/lib/logger";
import * as handlers from "./handlers";

export const GET = apiHandler(handlers.GET);
export const POST = createHandler(handlers.PostBodySchema, handlers.POST, {
  onValidationError: (error) => {
    logger.warn("Onboarding API validation failed", {
      issues: error.issues,
    });
  },
  onInvalidJson: (error) => {
    logger.error("Onboarding API POST error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to save onboarding state" },
      { status: 500 },
    );
  },
});
