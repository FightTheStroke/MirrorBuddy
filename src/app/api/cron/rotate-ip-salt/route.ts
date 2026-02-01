/**
 * IP Salt Rotation Cron Job (F-01)
 *
 * Monthly cron job to rotate the IP hashing salt.
 * Generates a new salt and stores it in Redis.
 * Admin must manually update the IP_HASH_SALT environment variable in Vercel.
 *
 * Schedule: 0 0 1 * * (First day of month at midnight UTC)
 */

import { pipe, withSentry, withCron } from "@/lib/api/middlewares";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

// Lazy initialization to avoid build-time errors
let redis: ReturnType<typeof Redis.fromEnv> | null = null;
let resend: Resend | null = null;

function getRedis() {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export const POST = pipe(
  withSentry("/api/cron/rotate-ip-salt"),
  withCron,
)(async () => {
  // Generate new salt (32 bytes = 256 bits = 64 hex chars)
  const newSalt = crypto.randomBytes(32).toString("hex");
  const rotationDate = new Date().toISOString();

  // Store in Redis as pending (admin must apply to env var)
  await getRedis().set("mirrorbuddy:ip-salt:pending", {
    salt: newSalt,
    generatedAt: rotationDate,
    appliedToEnv: false,
  });

  // Send admin notification email
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendClient = getResend();
  if (adminEmail && resendClient) {
    await resendClient.emails.send({
      from: "MirrorBuddy <noreply@mirrorbuddy.it>",
      to: adminEmail,
      subject: "[Action Required] Monthly IP Salt Rotation",
      text: `New IP hash salt generated for monthly rotation.

NEW SALT: ${newSalt}

Please update the IP_HASH_SALT environment variable in Vercel:
1. Go to Vercel Dashboard → MirrorBuddy → Settings → Environment Variables
2. Update IP_HASH_SALT with the new value above
3. Redeploy to apply

Generated: ${rotationDate}

This is a security measure to prevent IP hash rainbow table attacks.`,
    });
  }

  logger.info("IP salt rotation completed", { rotationDate });

  return Response.json({
    success: true,
    message: "Salt rotation completed. Admin notified.",
    rotationDate,
  });
});
