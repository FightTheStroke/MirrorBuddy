/**
 * Beta Invite Service
 *
 * Handles the full invite lifecycle:
 * - Request submission
 * - Admin notification
 * - Approval with credential generation
 * - Rejection with optional reason
 */

import { prisma } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { hashPassword, generateRandomPassword } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  getAdminNotificationTemplate,
  getRequestReceivedTemplate,
  getApprovalTemplate,
  getRejectionTemplate,
} from "@/lib/email/templates/invite-templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mirrorbuddy.app";

export interface CreateInviteRequestResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

export interface ApproveInviteResult {
  success: boolean;
  userId?: string;
  username?: string;
  error?: string;
}

export interface RejectInviteResult {
  success: boolean;
  error?: string;
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ requestId: string; error: string }>;
}

/**
 * Notify admin of new beta request
 */
export async function notifyAdminNewRequest(requestId: string): Promise<void> {
  try {
    const request = await prisma.inviteRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      logger.warn("Invite request not found for notification", { requestId });
      return;
    }

    // Fetch trial session data if available
    let trialStats:
      | {
          chatsUsed: number;
          voiceMinutesUsed: number;
          toolsUsed: number;
        }
      | undefined;

    if (request.trialSessionId) {
      const trialSession = await prisma.trialSession.findUnique({
        where: { id: request.trialSessionId },
      });

      if (trialSession) {
        trialStats = {
          chatsUsed: trialSession.chatsUsed,
          voiceMinutesUsed: Math.round(trialSession.voiceSecondsUsed / 60),
          toolsUsed: trialSession.toolsUsed,
        };
      }
    }

    const template = getAdminNotificationTemplate({
      name: request.name,
      email: request.email,
      motivation: request.motivation,
      trialSessionId: request.trialSessionId || undefined,
      requestId: request.id,
      trialStats,
    });

    await sendEmail({
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info("Admin notified of new beta request", { requestId });
  } catch (error) {
    logger.error("Failed to notify admin", { requestId }, error as Error);
  }
}

/**
 * Send confirmation to user after request submission
 */
export async function sendRequestConfirmation(
  requestId: string,
): Promise<void> {
  try {
    if (!isEmailConfigured()) {
      return;
    }

    const request = await prisma.inviteRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) return;

    const template = getRequestReceivedTemplate({
      name: request.name,
      email: request.email,
    });

    await sendEmail({
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info("Request confirmation sent", {
      requestId,
      email: request.email,
    });
  } catch (error) {
    logger.error("Failed to send confirmation", { requestId }, error as Error);
  }
}

/**
 * Generate a username from email using cryptographically secure randomness
 * lgtm[js/insecure-randomness] - crypto.getRandomValues IS cryptographically secure (CSPRNG)
 */
function generateUsername(email: string): string {
  const local = email.split("@")[0];
  // Clean up: remove dots, plus signs, etc.
  const clean = local.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  // Add random suffix using CSPRNG (crypto.getRandomValues) for uniqueness
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  const suffix = Array.from(array)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .substring(0, 4);
  return `${clean}${suffix}`;
}

/**
 * Approve an invite request: create user and send credentials
 */
export async function approveInviteRequest(
  requestId: string,
  adminUserId: string,
): Promise<ApproveInviteResult> {
  try {
    const request = await prisma.inviteRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return { success: false, error: "Richiesta non trovata" };
    }

    if (request.status !== "PENDING") {
      return { success: false, error: "Richiesta già processata" };
    }

    // Generate credentials using CSPRNG (crypto.getRandomValues)
    const username = generateUsername(request.email);
    // Note: generateUsername and generateRandomPassword both use crypto.getRandomValues (CSPRNG)
    const temporaryPassword = generateRandomPassword(12);
    const passwordHash = await hashPassword(temporaryPassword);

    // Create user and update invite in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create new user
      const user = await tx.user.create({
        data: {
          username,
          email: request.email,
          passwordHash,
          mustChangePassword: true,
          profile: {
            create: {
              name: request.name,
            },
          },
          settings: {
            create: {},
          },
        },
      });

      // Update invite request
      await tx.inviteRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
          generatedUsername: username,
          createdUserId: user.id,
        },
      });

      return user;
    });

    // Send approval email
    const template = getApprovalTemplate({
      name: request.name,
      email: request.email,
      username,
      temporaryPassword,
      loginUrl: `${APP_URL}/auth/login`,
    });

    await sendEmail({
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info("Invite approved", {
      requestId,
      userId: result.id,
      username,
      adminUserId,
    });

    return { success: true, userId: result.id, username };
  } catch (error) {
    logger.error("Failed to approve invite", { requestId }, error as Error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Errore durante l'approvazione",
    };
  }
}

/**
 * Reject an invite request with optional reason
 */
export async function rejectInviteRequest(
  requestId: string,
  adminUserId: string,
  reason?: string,
): Promise<RejectInviteResult> {
  try {
    const request = await prisma.inviteRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return { success: false, error: "Richiesta non trovata" };
    }

    if (request.status !== "PENDING") {
      return { success: false, error: "Richiesta già processata" };
    }

    // Update status
    await prisma.inviteRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        rejectionReason: reason || null,
      },
    });

    // Send rejection email
    const template = getRejectionTemplate({
      name: request.name,
      email: request.email,
      reason,
    });

    await sendEmail({
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info("Invite rejected", {
      requestId,
      adminUserId,
      hasReason: !!reason,
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to reject invite", { requestId }, error as Error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Errore durante il rifiuto",
    };
  }
}

/**
 * Get pending invites for admin review
 */
export async function getPendingInvites() {
  return prisma.inviteRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get all invites with optional status filter
 */
export async function getInvites(
  status?: "PENDING" | "APPROVED" | "REJECTED",
  isDirect?: boolean,
  reviewedBy?: string,
) {
  return prisma.inviteRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(isDirect === undefined ? {} : { isDirect }),
      ...(reviewedBy ? { reviewedBy } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Bulk approve multiple invite requests
 * Processes up to MAX_BATCH_SIZE requests with concurrency limit
 */
const MAX_BATCH_SIZE = 50;
const CONCURRENCY_LIMIT = 5;

export async function bulkApproveInvites(
  requestIds: string[],
  adminUserId: string,
): Promise<BulkOperationResult> {
  const ids = requestIds.slice(0, MAX_BATCH_SIZE);
  const errors: Array<{ requestId: string; error: string }> = [];
  let processed = 0;

  // Process in chunks to avoid overwhelming email service
  for (let i = 0; i < ids.length; i += CONCURRENCY_LIMIT) {
    const chunk = ids.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.allSettled(
      chunk.map((id) => approveInviteRequest(id, adminUserId)),
    );

    results.forEach((result, idx) => {
      const requestId = chunk[idx];
      if (result.status === "fulfilled" && result.value.success) {
        processed++;
      } else {
        const error =
          result.status === "rejected"
            ? String(result.reason)
            : result.value.error || "Unknown error";
        errors.push({ requestId, error });
      }
    });
  }

  logger.info("Bulk approve completed", {
    total: ids.length,
    processed,
    failed: errors.length,
    adminUserId,
  });

  return {
    success: errors.length === 0,
    processed,
    failed: errors.length,
    errors,
  };
}

/**
 * Bulk reject multiple invite requests
 * Processes up to MAX_BATCH_SIZE requests with concurrency limit
 */
export async function bulkRejectInvites(
  requestIds: string[],
  adminUserId: string,
  reason?: string,
): Promise<BulkOperationResult> {
  const ids = requestIds.slice(0, MAX_BATCH_SIZE);
  const errors: Array<{ requestId: string; error: string }> = [];
  let processed = 0;

  // Process in chunks to avoid overwhelming email service
  for (let i = 0; i < ids.length; i += CONCURRENCY_LIMIT) {
    const chunk = ids.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.allSettled(
      chunk.map((id) => rejectInviteRequest(id, adminUserId, reason)),
    );

    results.forEach((result, idx) => {
      const requestId = chunk[idx];
      if (result.status === "fulfilled" && result.value.success) {
        processed++;
      } else {
        const error =
          result.status === "rejected"
            ? String(result.reason)
            : result.value.error || "Unknown error";
        errors.push({ requestId, error });
      }
    });
  }

  logger.info("Bulk reject completed", {
    total: ids.length,
    processed,
    failed: errors.length,
    adminUserId,
  });

  return {
    success: errors.length === 0,
    processed,
    failed: errors.length,
    errors,
  };
}
