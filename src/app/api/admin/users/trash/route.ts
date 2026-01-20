import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireCSRF } from "@/lib/security/csrf";

export const GET = withAdmin(async () => {
  try {
    const backups = await prisma.deletedUserBackup.findMany({
      orderBy: { deletedAt: "desc" },
      select: {
        userId: true,
        email: true,
        username: true,
        role: true,
        deletedAt: true,
        purgeAt: true,
        deletedBy: true,
        reason: true,
      },
    });

    return NextResponse.json({ backups });
  } catch (error) {
    logger.error("Failed to fetch deleted users", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to fetch deleted users" },
      { status: 500 },
    );
  }
});

export const DELETE = withAdmin(async (request: NextRequest) => {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    if (!before) {
      return NextResponse.json(
        { error: "before query param required" },
        { status: 400 },
      );
    }

    const cutoff = new Date(before);
    if (Number.isNaN(cutoff.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const result = await prisma.deletedUserBackup.deleteMany({
      where: { purgeAt: { lte: cutoff } },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    logger.error("Failed to purge deleted users", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to purge deleted users" },
      { status: 500 },
    );
  }
});
