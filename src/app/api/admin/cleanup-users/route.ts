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

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getProtectedUsers } from "@/lib/test-isolation/protected-users";
import { hashPII } from "@/lib/security/pii-encryption";

export const DELETE = pipe(
  withSentry("/api/admin/cleanup-users"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const isDryRun = ctx.req.nextUrl.searchParams.get("dryRun") === "true";

  // Get protected emails from environment variable
  const protectedEmails = getProtectedUsers();

  // Hash protected emails for lookup
  const protectedEmailHashes = await Promise.all(
    protectedEmails.map((email) => hashPII(email)),
  );

  // Find protected users
  const protectedUsers = await prisma.user.findMany({
    where: { emailHash: { in: protectedEmailHashes } },
    select: { id: true, email: true },
  });

  const protectedIds: string[] = protectedUsers.map(
    (u: { id: string; email: string | null }) => u.id,
  );

  // Count before deletion - only test data users (safety: never delete production users)
  const totalTestUsers = await prisma.user.count({
    where: { isTestData: true },
  });
  const usersToDelete = await prisma.user.count({
    where: {
      isTestData: true,
      id: { notIn: protectedIds },
    },
  });

  if (isDryRun) {
    const sample = await prisma.user.findMany({
      where: {
        isTestData: true,
        id: { notIn: protectedIds },
      },
      select: { id: true, email: true, createdAt: true },
      take: 20,
    });

    return NextResponse.json({
      dryRun: true,
      totalTestUsers,
      usersToDelete,
      protectedUsers: protectedUsers.map(
        (u: { id: string; email: string | null }): string | null => u.email,
      ),
      sampleToDelete: sample.map(
        (u: {
          id: string;
          email: string | null;
          createdAt: Date;
        }): { id: string; email: string; createdAt: Date } => ({
          id: u.id,
          email: u.email || "no-email",
          createdAt: u.createdAt,
        }),
      ),
      note: "Only isTestData=true users will be deleted (safety filter)",
    });
  }

  // LIVE DELETE - only test data users (safety: never delete production users)
  logger.warn("Admin cleanup: deleting test data users except protected", {
    adminId: ctx.userId,
    usersToDelete,
    protectedEmails,
  });

  // 1. Clean UserActivity for test users only
  const testUserIds = (
    await prisma.user.findMany({
      where: { isTestData: true, id: { notIn: protectedIds } },
      select: { id: true },
    })
  ).map((u: { id: string }) => u.id);

  const activityResult = await prisma.userActivity.deleteMany({
    where: { identifier: { in: testUserIds } },
  });

  // 2. Clean InviteRequests for test emails only
  const testEmails = (
    await prisma.user.findMany({
      where: { isTestData: true, id: { notIn: protectedIds } },
      select: { email: true },
    })
  )
    .map((u: { email: string | null }) => u.email)
    .filter((e): e is string => e !== null);

  // Delete InviteRequests for test emails (uses plain email field)
  const inviteResult = await prisma.inviteRequest.deleteMany({
    where: { email: { in: testEmails } },
  });

  // 3. Delete test users only (cascade handles related records)
  const userResult = await prisma.user.deleteMany({
    where: {
      isTestData: true,
      id: { notIn: protectedIds },
    },
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
    protectedEmails,
    note: "Only isTestData=true users were deleted (safety filter)",
  });
});
