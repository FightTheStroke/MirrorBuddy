/**
 * Stripe Checkout Session API
 * POST /api/checkout - Create Stripe checkout session
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAuth } from "@/lib/api/middlewares";
import { stripeService } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { z } from "zod";

const CheckoutSchema = z.object({
  priceId: z.string().min(1, "Price ID required"),
  locale: z.enum(["it", "en", "fr", "de", "es"]).optional(),
});

/**
 * POST /api/checkout
 * Create Stripe Checkout session with automatic tax calculation
 * Requires authenticated user
 */
export const POST = pipe(
  withSentry("/api/checkout"),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const body = await ctx.req.json();
  const validation = CheckoutSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid request", details: validation.error.issues },
      { status: 400 },
    );
  }

  const { priceId, locale } = validation.data;

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  });

  if (!user?.email) {
    return NextResponse.json(
      { error: "User email not found" },
      { status: 400 },
    );
  }

  try {
    const origin = ctx.req.nextUrl.origin;
    const session = await stripeService.createCheckoutSession({
      priceId,
      email: user.email,
      userId: ctx.userId,
      successUrl: `${origin}/dashboard?checkout=success`,
      cancelUrl: `${origin}/pricing?checkout=cancelled`,
      locale,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create checkout session", details: message },
      { status: 500 },
    );
  }
});
