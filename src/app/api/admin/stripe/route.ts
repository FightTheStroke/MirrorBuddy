/**
 * Stripe Admin API Route
 *
 * GET /api/admin/stripe - Get Stripe overview (products, subscriptions, revenue)
 *
 * Authentication: Admin only
 * Rate limiting: None (internal admin tool)
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { getStripeAdminData } from "@/lib/admin/stripe-admin-service";
import { logger } from "@/lib/logger";

export const GET = pipe(
  withSentry("/api/admin/stripe"),
  withAdmin,
)(async (ctx) => {
  // Get Stripe data (mock or real depending on configuration)
  const data = await getStripeAdminData();

  logger.info("Stripe admin data fetched", {
    adminId: ctx.userId,
    configured: data.configured,
    productsCount: data.products.length,
    subscriptionsCount: data.subscriptions.length,
  });

  return NextResponse.json(data);
});
