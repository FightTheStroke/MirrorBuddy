/**
 * Direct Invite API
 *
 * POST /api/invites/direct
 * Body: { email: string, name?: string }
 *
 * Creates a user directly without requiring an invite request.
 * Generates credentials and sends welcome email.
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { hashPassword, generateRandomPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email";
import { getApprovalTemplate } from "@/lib/email/templates/invite-templates";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mirrorbuddy.app";

interface DirectInviteBody {
  email: string;
  name?: string;
}

/**
 * Generate a username from email using CSPRNG
 */
function generateUsername(email: string): string {
  const local = email.split("@")[0];
  const clean = local.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  const suffix = Array.from(array)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .substring(0, 4);
  return `${clean}${suffix}`;
}

export const POST = pipe(
  withSentry("/api/invites/direct"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const adminUserId = ctx.userId!;
  const body: DirectInviteBody = await ctx.req.json();

  // Validate email with safe linear-time check (no nested quantifiers)
  const rawEmail = body.email?.trim().toLowerCase() || "";
  if (
    !rawEmail ||
    rawEmail.length > 254 ||
    !rawEmail.includes("@") ||
    rawEmail.indexOf("@") === 0 ||
    rawEmail.indexOf("@") !== rawEmail.lastIndexOf("@") ||
    !rawEmail.substring(rawEmail.indexOf("@") + 1).includes(".")
  ) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 },
    );
  }

  const email = rawEmail;

  // Check for existing user
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { googleAccount: { email } }],
    },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 },
    );
  }

  // Generate credentials
  const username = generateUsername(email);
  const temporaryPassword = generateRandomPassword(12);
  const passwordHash = await hashPassword(temporaryPassword);
  const displayName = body.name?.trim() || email.split("@")[0];

  // Create user + invite record in transaction
  const user = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          mustChangePassword: true,
          profile: {
            create: {
              name: displayName,
            },
          },
          settings: {
            create: {},
          },
        },
      });

      await tx.inviteRequest.upsert({
        where: { email },
        update: {
          name: displayName,
          motivation: "Invito diretto admin",
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
          generatedUsername: username,
          createdUserId: newUser.id,
          isDirect: true,
        },
        create: {
          name: displayName,
          email,
          motivation: "Invito diretto admin",
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
          generatedUsername: username,
          createdUserId: newUser.id,
          isDirect: true,
        },
      });

      return newUser;
    },
  );

  // Send welcome email
  const template = getApprovalTemplate({
    name: displayName,
    email,
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

  logger.info("Direct invite created", {
    userId: user.id,
    username,
    email,
    adminUserId,
  });

  return NextResponse.json({
    success: true,
    userId: user.id,
    username,
    email,
  });
});
