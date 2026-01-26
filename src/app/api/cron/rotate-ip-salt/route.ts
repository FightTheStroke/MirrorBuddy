/**
 * IP Salt Rotation Cron Job (F-01)
 *
 * Monthly cron job to rotate the IP hashing salt.
 * Generates a new salt and stores it in Redis.
 * Admin must manually update the IP_HASH_SALT environment variable in Vercel.
 *
 * Schedule: 0 0 1 * * (First day of month at midnight UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

const redis = Redis.fromEnv();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // Validate cron secret header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Generate new salt (32 bytes = 256 bits = 64 hex chars)
    const newSalt = crypto.randomBytes(32).toString("hex");
    const rotationDate = new Date().toISOString();

    // Store in Redis as pending (admin must apply to env var)
    await redis.set("mirrorbuddy:ip-salt:pending", {
      salt: newSalt,
      generatedAt: rotationDate,
      appliedToEnv: false,
    });

    // Send admin notification email
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && process.env.RESEND_API_KEY) {
      await resend.emails.send({
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

    return NextResponse.json({
      success: true,
      message: "Salt rotation completed. Admin notified.",
      rotationDate,
    });
  } catch (error) {
    logger.error("IP salt rotation failed", { error: String(error) });
    return NextResponse.json(
      { error: "Salt rotation failed" },
      { status: 500 },
    );
  }
}
