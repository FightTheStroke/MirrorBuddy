import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { generateRandomPassword, hashPassword } from "@/lib/auth/server";
import { sendEmail } from "@/lib/email";

export const POST = pipe(
  withSentry("/api/admin/users/[id]/reset-password"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  // Extract user ID from route params
  const params = await ctx.params;
  const targetId = params.id;
  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user) {
    logger.warn("User not found for password reset", {
      userId: targetId,
      adminId: ctx.userId,
    });
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.email) {
    logger.warn("User has no email for password reset", {
      userId: targetId,
      adminId: ctx.userId,
    });
    return NextResponse.json(
      { error: "User has no email address configured" },
      { status: 400 },
    );
  }

  const tempPassword = generateRandomPassword(16);
  const passwordHash = await hashPassword(tempPassword);

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { passwordHash, mustChangePassword: true },
  });

  await sendEmail({
    to: user.email,
    subject: "MirrorBuddy - Password Reset",
    html: `<h2>Password Reset</h2><p>Admin reset your password.</p><p><strong>Temp Password:</strong> <code>${tempPassword}</code></p><p>You must change this when you log in.</p>`,
    text: `Password reset. Temp password: ${tempPassword}. Change it on next login.`,
  });

  logger.info("Password reset completed", {
    userId: targetId,
    adminId: ctx.userId,
  });

  return NextResponse.json({
    success: true,
    tempPassword,
    user: {
      id: updated.id,
      username: updated.username,
      email: updated.email,
    },
  });
});
