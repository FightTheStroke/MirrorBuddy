/**
 * Video Vision Usage Service - ADR 0122
 *
 * Tracks per-session and monthly video vision consumption.
 * Enforces session-level and monthly limits from tier configuration.
 *
 * Usage flow:
 * 1. canStartSession(userId) - Check if user can start video capture
 * 2. startSession(userId, voiceSessionId) - Create usage record
 * 3. addFrames(usageId, count) - Increment frame count during session
 * 4. endSession(usageId, seconds) - Finalize usage with duration
 * 5. getMonthlyUsage(userId) - Get total seconds used this month
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { tierService } from "./tier-service";

const log = logger.child({ module: "video-vision-usage" });

/**
 * Get current period month string (e.g., "2026-02")
 */
function getCurrentPeriodMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get total video vision seconds used this month by a user
 */
export async function getMonthlyUsage(userId: string): Promise<number> {
  const periodMonth = getCurrentPeriodMonth();

  const result = await prisma.videoVisionUsage.aggregate({
    where: { userId, periodMonth },
    _sum: { secondsUsed: true },
  });

  return result._sum.secondsUsed || 0;
}

/**
 * Check if a user can start a new video vision session
 *
 * Returns allowed status with remaining limits, or denied with reason.
 */
export async function canStartSession(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remainingSessionSeconds: number;
  remainingMonthlyMinutes: number;
}> {
  try {
    const limits = await tierService.getLimitsForUser(userId);

    // Check if video vision is enabled (seconds > 0 means enabled)
    if (limits.videoVisionSecondsPerSession <= 0) {
      return {
        allowed: false,
        reason: "video_vision_disabled",
        remainingSessionSeconds: 0,
        remainingMonthlyMinutes: 0,
      };
    }

    // Check monthly limit
    const monthlySecondsUsed = await getMonthlyUsage(userId);
    const monthlyLimitSeconds = limits.videoVisionMinutesMonthly * 60;
    const remainingMonthlySeconds = Math.max(
      0,
      monthlyLimitSeconds - monthlySecondsUsed,
    );

    if (remainingMonthlySeconds <= 0) {
      return {
        allowed: false,
        reason: "monthly_limit_reached",
        remainingSessionSeconds: 0,
        remainingMonthlyMinutes: 0,
      };
    }

    // Check for active session (prevent concurrent)
    const activeSession = await prisma.videoVisionUsage.findFirst({
      where: { userId, endedAt: null },
    });

    if (activeSession) {
      return {
        allowed: false,
        reason: "session_already_active",
        remainingSessionSeconds: 0,
        remainingMonthlyMinutes: Math.floor(remainingMonthlySeconds / 60),
      };
    }

    // Session seconds is the minimum of per-session limit and remaining monthly
    const sessionSeconds = Math.min(
      limits.videoVisionSecondsPerSession,
      remainingMonthlySeconds,
    );

    return {
      allowed: true,
      remainingSessionSeconds: sessionSeconds,
      remainingMonthlyMinutes: Math.floor(remainingMonthlySeconds / 60),
    };
  } catch (error) {
    log.error("Error checking video vision session eligibility", {
      userId,
      error: String(error),
    });
    return {
      allowed: false,
      reason: "internal_error",
      remainingSessionSeconds: 0,
      remainingMonthlyMinutes: 0,
    };
  }
}

/**
 * Start a new video vision usage session
 *
 * @returns Usage record ID for tracking frames and ending session
 */
export async function startSession(
  userId: string,
  voiceSessionId: string,
): Promise<{ id: string; maxSeconds: number } | null> {
  try {
    const eligibility = await canStartSession(userId);
    if (!eligibility.allowed) {
      log.warn("Cannot start video vision session", {
        userId,
        reason: eligibility.reason,
      });
      return null;
    }

    const usage = await prisma.videoVisionUsage.create({
      data: {
        userId,
        voiceSessionId,
        periodMonth: getCurrentPeriodMonth(),
        framesUsed: 0,
        secondsUsed: 0,
      },
    });

    log.info("Video vision session started", {
      usageId: usage.id,
      userId,
      voiceSessionId,
      maxSeconds: eligibility.remainingSessionSeconds,
    });

    return {
      id: usage.id,
      maxSeconds: eligibility.remainingSessionSeconds,
    };
  } catch (error) {
    log.error("Error starting video vision session", {
      userId,
      voiceSessionId,
      error: String(error),
    });
    return null;
  }
}

/**
 * Add frames to an active video vision session
 */
export async function addFrames(
  usageId: string,
  count: number,
): Promise<boolean> {
  try {
    await prisma.videoVisionUsage.update({
      where: { id: usageId },
      data: { framesUsed: { increment: count } },
    });
    return true;
  } catch (error) {
    log.error("Error adding frames to video vision session", {
      usageId,
      count,
      error: String(error),
    });
    return false;
  }
}

/**
 * End a video vision session with final duration
 */
export async function endSession(
  usageId: string,
  secondsUsed: number,
): Promise<boolean> {
  try {
    await prisma.videoVisionUsage.update({
      where: { id: usageId },
      data: {
        secondsUsed,
        endedAt: new Date(),
      },
    });

    log.info("Video vision session ended", { usageId, secondsUsed });
    return true;
  } catch (error) {
    log.error("Error ending video vision session", {
      usageId,
      secondsUsed,
      error: String(error),
    });
    return false;
  }
}

/**
 * Get video vision limits and current usage for a user
 * Used by the GET /api/video-vision/limits endpoint
 */
export async function getLimitsAndUsage(userId: string): Promise<{
  allowed: boolean;
  perSessionSeconds: number;
  monthlyMinutes: number;
  monthlySecondsUsed: number;
  monthlyMinutesRemaining: number;
}> {
  try {
    const limits = await tierService.getLimitsForUser(userId);
    const monthlySecondsUsed = await getMonthlyUsage(userId);
    const monthlyLimitSeconds = limits.videoVisionMinutesMonthly * 60;
    const remainingSeconds = Math.max(
      0,
      monthlyLimitSeconds - monthlySecondsUsed,
    );

    return {
      allowed: limits.videoVisionSecondsPerSession > 0,
      perSessionSeconds: limits.videoVisionSecondsPerSession,
      monthlyMinutes: limits.videoVisionMinutesMonthly,
      monthlySecondsUsed,
      monthlyMinutesRemaining: Math.floor(remainingSeconds / 60),
    };
  } catch (error) {
    log.error("Error fetching video vision limits", {
      userId,
      error: String(error),
    });
    return {
      allowed: false,
      perSessionSeconds: 0,
      monthlyMinutes: 0,
      monthlySecondsUsed: 0,
      monthlyMinutesRemaining: 0,
    };
  }
}
