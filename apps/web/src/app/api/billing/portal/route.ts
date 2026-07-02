/**
 * Stripe Customer Portal API
 * POST /api/billing/portal - Create portal session for subscription management
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { stripeService } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import {
  assertNotUnconsentedMinor,
  guardianRequiredResponse,
} from "@/lib/compliance/server";


export const revalidate = 0;
export const POST = pipe(
  withSentry("/api/billing/portal"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  // T1.6 (D-11): server-side guardian check. The client grown-up gate is
  // NOT verifiable parental consent — block unconsented minors here.
  const gate = await assertNotUnconsentedMinor(
    ctx.userId!,
    "/api/billing/portal",
  );
  if (!gate.allowed) {
    return guardianRequiredResponse();
  }

  const userSub = await prisma.userSubscription.findUnique({
    where: { userId: ctx.userId },
    select: { stripeCustomerId: true },
  });

  if (!userSub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 },
    );
  }

  try {
    const origin = ctx.req.nextUrl.origin;
    const session = await stripeService.createCustomerPortalSession({
      customerId: userSub.stripeCustomerId,
      returnUrl: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create portal session", details: message },
      { status: 500 },
    );
  }
});
