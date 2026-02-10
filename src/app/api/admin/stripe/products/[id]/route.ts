/**
 * Stripe Product Detail API Route
 *
 * PUT /api/admin/stripe/products/[id] — Update product
 * DELETE /api/admin/stripe/products/[id] — Archive product
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import {
  updateProduct,
  archiveProduct,
} from '@/lib/admin/stripe-products-service';
import { logAdminAction, getClientIp } from '@/lib/admin/audit-service';
import { z } from 'zod';

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export const PUT = pipe(
  withSentry('/api/admin/stripe/products/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const id = (await ctx.params).id;
  const body = await ctx.req.json();
  const validation = UpdateProductSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.issues },
      { status: 400 },
    );
  }

  const product = await updateProduct(id, {
    name: validation.data.name,
    description: validation.data.description,
    metadata: validation.data.metadata as Record<string, string> | undefined,
  });

  await logAdminAction({
    action: 'UPDATE_PRODUCT',
    entityType: 'StripeProduct',
    entityId: id,
    adminId: ctx.userId!,
    details: validation.data,
    ipAddress: getClientIp(ctx.req),
  });

  return NextResponse.json(product);
});

export const DELETE = pipe(
  withSentry('/api/admin/stripe/products/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const id = (await ctx.params).id;

  await archiveProduct(id);

  await logAdminAction({
    action: 'ARCHIVE_PRODUCT',
    entityType: 'StripeProduct',
    entityId: id,
    adminId: ctx.userId!,
    ipAddress: getClientIp(ctx.req),
  });

  return NextResponse.json({ archived: true });
});
