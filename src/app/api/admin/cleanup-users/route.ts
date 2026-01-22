/**
 * Admin API - Cleanup Users
 *
 * DELETE /api/admin/cleanup-users
 *
 * Removes all users except protected emails.
 * Requires admin authentication.
 *
 * Query params:
 *   - dryRun=true: Preview what would be deleted
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { logger } from "@/lib/logger";

// Users to NEVER delete
const PROTECTED_EMAILS = ["roberdan@gmail.com", "francesca@fightthestroke.org"];

export async function DELETE(request: NextRequest) {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  const isDryRun = request.nextUrl.searchParams.get("dryRun") === "true";

  try {
    // Find protected users
    const protectedUsers = await prisma.user.findMany({
      where: { email: { in: PROTECTED_EMAILS } },
      select: { id: true, email: true },
    });

    const protectedIds: string[] = protectedUsers.map((u) => u.id);

    // Count before deletion
    const totalUsers = await prisma.user.count();
    const usersToDelete = totalUsers - protectedUsers.length;

    if (isDryRun) {
      const sample = await prisma.user.findMany({
        where: { id: { notIn: protectedIds } },
        select: { id: true, email: true, createdAt: true },
        take: 20,
      });

      return NextResponse.json({
        dryRun: true,
        totalUsers,
        usersToDelete,
        protectedUsers: protectedUsers.map((u): string | null => u.email),
        sampleToDelete: sample.map(
          (u): { id: string; email: string; createdAt: Date } => ({
            id: u.id,
            email: u.email || "no-email",
            createdAt: u.createdAt,
          }),
        ),
      });
    }

    // LIVE DELETE
    logger.warn("Admin cleanup: deleting all users except protected", {
      adminId: auth.userId,
      usersToDelete,
      protectedEmails: PROTECTED_EMAILS,
    });

    // 1. Clean UserActivity
    const activityResult = await prisma.userActivity.deleteMany({
      where: { identifier: { notIn: protectedIds } },
    });

    // 2. Clean InviteRequests
    const inviteResult = await prisma.inviteRequest.deleteMany({
      where: { email: { notIn: PROTECTED_EMAILS } },
    });

    // 3. Delete users (cascade handles related records)
    const userResult = await prisma.user.deleteMany({
      where: { id: { notIn: protectedIds } },
    });

    // Final count
    const remainingUsers = await prisma.user.count();

    logger.info("Admin cleanup complete", {
      deletedUsers: userResult.count,
      deletedActivity: activityResult.count,
      deletedInvites: inviteResult.count,
      remainingUsers,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        users: userResult.count,
        activityRecords: activityResult.count,
        inviteRequests: inviteResult.count,
      },
      remainingUsers,
      protectedEmails: PROTECTED_EMAILS,
    });
  } catch (error) {
    logger.error("Admin cleanup failed", { error: String(error) });
    return NextResponse.json(
      { error: "Cleanup failed", details: String(error) },
      { status: 500 },
    );
  }
}
