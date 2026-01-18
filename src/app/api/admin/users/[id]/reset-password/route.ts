import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withAdmin } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db";
import { generateRandomPassword, hashPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email";

export const POST = withAdmin(
  async (request: NextRequest, { userId: adminId, params }) => {
    try {
      // Extract user ID from route params (Next.js App Router)
      const routeParams = await params;
      const targetId = routeParams?.id;
      if (!targetId || typeof targetId !== "string") {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 },
        );
      }

      const user = await prisma.user.findUnique({ where: { id: targetId } });
      if (!user) {
        logger.warn("User not found for password reset", {
          userId: targetId,
          adminId,
        });
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (!user.email) {
        logger.warn("User has no email for password reset", {
          userId: targetId,
          adminId,
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
        adminId,
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
    } catch (error) {
      logger.error("Failed to reset password", {}, error as Error);
      return NextResponse.json(
        { error: "Failed to reset password" },
        { status: 500 },
      );
    }
  },
);
