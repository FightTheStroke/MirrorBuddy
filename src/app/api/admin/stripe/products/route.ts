/**
 * Stripe Products API Route
 *
 * GET /api/admin/stripe/products — List products with prices
 * POST /api/admin/stripe/products — Create product + initial price
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { getProducts } from '@/lib/admin/stripe-admin-service';
import {
  createProduct,
  createPrice,
  syncProductToTier,
} from '@/lib/admin/stripe-products-service';
import { logAdminAction, getClientIp } from '@/lib/admin/audit-service';
import { z } from 'zod';


export const revalidate = 0;
const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  price: z.object({
    unitAmount: z.number().int().positive(),
    currency: z.string().default('eur'),
    interval: z.enum(['month', 'year']),
  }).optional(),
  tierCode: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const GET = pipe(
  withSentry('/api/admin/stripe/products'),
  withAdmin,
)(async () => {
  const products = await getProducts();
  return NextResponse.json({ products });
});

export const POST = pipe(
  withSentry('/api/admin/stripe/products'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();
  const validation = CreateProductSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.issues },
      { status: 400 },
    );
  }

  const { name, description, price, tierCode, metadata } = validation.data;

  const product = await createProduct({
    name,
    description,
    metadata: metadata as Record<string, string> | undefined,
  });

  if (price) {
    const newPrice = await createPrice({
      productId: product.id,
      unitAmount: price.unitAmount,
      currency: price.currency,
      interval: price.interval,
    });
    product.prices = [newPrice];
  }

  if (tierCode) {
    await syncProductToTier(product.id, tierCode);
  }

  await logAdminAction({
    action: 'CREATE_PRODUCT',
    entityType: 'StripeProduct',
    entityId: product.id,
    adminId: ctx.userId!,
    details: { name, tierCode },
    ipAddress: getClientIp(ctx.req),
  });

  return NextResponse.json(product, { status: 201 });
});
