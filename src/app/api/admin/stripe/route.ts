/**
 * Stripe Admin API Route
 *
 * GET /api/admin/stripe - Get Stripe overview (products, subscriptions, revenue)
 *
 * Authentication: Admin only
 * Rate limiting: None (internal admin tool)
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { getStripeAdminData } from "@/lib/admin/stripe-admin-service";
import { logger } from "@/lib/logger";

export async function GET(_request: NextRequest) {
  try {
    // Admin authentication required
    const adminAuth = await validateAdminAuth();
    if (!adminAuth.authenticated || !adminAuth.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 401 },
      );
    }

    // Get Stripe data (mock or real depending on configuration)
    const data = await getStripeAdminData();

    logger.info("Stripe admin data fetched", {
      adminId: adminAuth.userId,
      configured: data.configured,
      productsCount: data.products.length,
      subscriptionsCount: data.subscriptions.length,
    });

    return NextResponse.json(data);
  } catch (error) {
    logger.error("Error in Stripe admin API", {
      error: String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
