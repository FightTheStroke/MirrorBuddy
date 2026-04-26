/**
 * Key Rotation Service - Rotate encryption keys with batch processing
 * @module security/key-rotation
 */
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createHash } from "crypto";
import {
  decryptTokenWithKey,
  encryptTokenWithKey,
  decryptPIIWithKey,
  encryptPIIWithKey,
} from "./key-rotation-helpers";

const BATCH_SIZE = 100;

export interface RotationProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  phase: "scanning" | "rotating" | "complete";
}

export interface RotationOptions {
  onProgress?: (progress: RotationProgress) => void;
  dryRun?: boolean;
  batchSize?: number;
}

export async function rotateTokenEncryptionKey(
  oldKey: string,
  newKey: string,
  options: RotationOptions = {},
): Promise<RotationProgress> {
  const { onProgress, dryRun = false, batchSize = BATCH_SIZE } = options;
  logger.info("[KeyRotation] Token key rotation start", { dryRun, batchSize });
  const progress: RotationProgress = {
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    phase: "scanning",
  };
  const total = await prisma.googleAccount.count();
  progress.total = total;
  onProgress?.(progress);
  if (total === 0) {
    logger.info("[KeyRotation] No GoogleIntegration records");
    progress.phase = "complete";
    onProgress?.(progress);
    return progress;
  }
  progress.phase = "rotating";
  let skip = 0;
  while (skip < total) {
    const records = await prisma.googleAccount.findMany({
      take: batchSize,
      skip,
      select: { id: true, accessToken: true, refreshToken: true },
    });
    for (const record of records) {
      try {
        const decAccess = await decryptTokenWithKey(record.accessToken, oldKey);
        const decRefresh = record.refreshToken
          ? await decryptTokenWithKey(record.refreshToken, oldKey)
          : null;
        const newAccess = await encryptTokenWithKey(decAccess, newKey);
        const newRefresh = decRefresh
          ? await encryptTokenWithKey(decRefresh, newKey)
          : null;
        if (!dryRun) {
          await prisma.googleAccount.update({
            where: { id: record.id },
            data: { accessToken: newAccess, refreshToken: newRefresh },
          });
        }
        progress.succeeded++;
      } catch (error) {
        logger.error("[KeyRotation] Token rotation failed", {
          id: record.id,
          error: String(error),
        });
        progress.failed++;
      }
      progress.processed++;
      onProgress?.(progress);
    }
    skip += batchSize;
  }
  progress.phase = "complete";
  onProgress?.(progress);
  logger.info("[KeyRotation] Token rotation complete", {
    total: progress.total,
    succeeded: progress.succeeded,
    failed: progress.failed,
  });
  return progress;
}

export async function rotatePIIEncryptionKey(
  oldKey: string,
  newKey: string,
  options: RotationOptions = {},
): Promise<RotationProgress> {
  const { onProgress, dryRun = false, batchSize = BATCH_SIZE } = options;
  logger.info("[KeyRotation] PII key rotation start", { dryRun, batchSize });
  const progress: RotationProgress = {
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    phase: "scanning",
  };
  const total = await prisma.user.count({ where: { email: { not: null } } });
  progress.total = total;
  onProgress?.(progress);
  if (total === 0) {
    logger.info("[KeyRotation] No User records with email");
    progress.phase = "complete";
    onProgress?.(progress);
    return progress;
  }
  progress.phase = "rotating";
  let skip = 0;
  while (skip < total) {
    const users = await prisma.user.findMany({
      where: { email: { not: null } },
      take: batchSize,
      skip,
      select: { id: true, email: true },
    });
    for (const user of users) {
      try {
        if (!user.email) {
          progress.processed++;
          continue;
        }
        const decEmail = await decryptPIIWithKey(user.email, oldKey);
        const newEmail = await encryptPIIWithKey(decEmail, newKey);
        const newHash = createHash("sha256")
          .update(decEmail, "utf8")
          .digest("hex");
        if (!dryRun) {
          await prisma.user.update({
            where: { id: user.id },
            data: { email: newEmail, emailHash: newHash },
          });
        }
        progress.succeeded++;
      } catch (error) {
        logger.error("[KeyRotation] PII rotation failed", {
          id: user.id,
          error: String(error),
        });
        progress.failed++;
      }
      progress.processed++;
      onProgress?.(progress);
    }
    skip += batchSize;
  }
  progress.phase = "complete";
  onProgress?.(progress);
  logger.info("[KeyRotation] PII rotation complete", {
    total: progress.total,
    succeeded: progress.succeeded,
    failed: progress.failed,
  });
  return progress;
}

export async function rotateSessionKey(
  oldKey: string,
  newKey: string,
  options: RotationOptions = {},
): Promise<RotationProgress> {
  const { onProgress, dryRun = false } = options;
  logger.info("[KeyRotation] Session key rotation start", { dryRun });
  const progress: RotationProgress = {
    total: 1,
    processed: 0,
    succeeded: 0,
    failed: 0,
    phase: "scanning",
  };
  onProgress?.(progress);
  progress.phase = "rotating";
  try {
    logger.warn("[KeyRotation] Session rotation invalidates all sessions");
    if (!dryRun) {
      logger.info("[KeyRotation] Deploy new SESSION_SECRET");
    }
    progress.succeeded = 1;
    progress.processed = 1;
  } catch (error) {
    logger.error("[KeyRotation] Session rotation failed", {
      error: String(error),
    });
    progress.failed = 1;
    progress.processed = 1;
  }
  progress.phase = "complete";
  onProgress?.(progress);
  logger.info("[KeyRotation] Session rotation complete", {
    total: progress.total,
    succeeded: progress.succeeded,
    failed: progress.failed,
  });
  return progress;
}
