import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/subscriptions
 * List all subscriptions with optional filters
 * Query params: userId, tierId, status
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const tierId = searchParams.get("tierId");
    const status = searchParams.get("status");

    // Build filter object
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (tierId) where.tierId = tierId;
    if (status) where.status = status;

    const subscriptions = await prisma.userSubscription.findMany({
      where,
      include: {
        tier: true,
      },
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error("Error listing subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to list subscriptions" },
      { status: 500 },
    );
  }
}
