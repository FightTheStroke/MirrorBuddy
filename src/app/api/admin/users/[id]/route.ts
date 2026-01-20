import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withAdmin } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db";
import { requireCSRF } from "@/lib/security/csrf";
import { createDeletedUserBackup } from "@/lib/admin/user-trash-service";
import { executeUserDataDeletion } from "@/app/api/privacy/delete-my-data/helpers";

export const PATCH = withAdmin(
  async (request: NextRequest, { userId: adminId }) => {
    try {
      const targetId = new URL(request.url).pathname.split("/").pop();
      if (!targetId) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 },
        );
      }

      const { disabled } = (await request.json()) as { disabled?: boolean };
      if (disabled === undefined) {
        return NextResponse.json(
          { error: "disabled field is required" },
          { status: 400 },
        );
      }

      const user = await prisma.user.findUnique({ where: { id: targetId } });
      if (!user) {
        logger.warn("User not found", { userId: targetId, adminId });
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: { disabled },
      });

      logger.info("User status updated", {
        userId: targetId,
        adminId,
        disabled,
      });

      return NextResponse.json({
        success: true,
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          disabled: updated.disabled,
          role: updated.role,
        },
      });
    } catch (error) {
      logger.error("Failed to update user", {}, error as Error);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAdmin(
  async (request: NextRequest, { userId: adminId }) => {
    if (!requireCSRF(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    try {
      const targetId = new URL(request.url).pathname.split("/").pop();
      if (!targetId) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 },
        );
      }

      const body = (await request.json().catch(() => ({}))) as {
        reason?: string;
      };

      const user = await prisma.user.findUnique({ where: { id: targetId } });
      if (!user) {
        logger.warn("User not found", { userId: targetId, adminId });
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      await createDeletedUserBackup(targetId, adminId, body.reason);
      await executeUserDataDeletion(targetId);

      logger.info("Admin deleted user with backup", {
        userId: targetId,
        adminId,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete user", {}, error as Error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 },
      );
    }
  },
);
