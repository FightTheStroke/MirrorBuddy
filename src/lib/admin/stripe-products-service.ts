/**
 * Stripe Products Service
 *
 * CRUD operations for Stripe products and prices.
 * All operations use real Stripe SDK via stripeService.getServerClient().
 */

import { logger } from '@/lib/logger';
import { stripeService } from '@/lib/stripe/stripe-service';
import { prisma } from '@/lib/db';
import type {
  ProductCreateInput,
  PriceCreateInput,
  StripeProduct,
  StripePrice,
} from './stripe-admin-types';

const log = logger.child({ module: 'stripe-products' });

export async function createProduct(
  input: ProductCreateInput,
): Promise<StripeProduct> {
  const stripe = stripeService.getServerClient();

  const product = await stripe.products.create({
    name: input.name,
    description: input.description,
    metadata: input.metadata || {},
  });

  log.info('Product created', { productId: product.id, name: input.name });

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    active: product.active,
    prices: [],
    metadata: product.metadata || {},
    created: product.created,
  };
}

export async function updateProduct(
  productId: string,
  input: Partial<ProductCreateInput>,
): Promise<StripeProduct> {
  const stripe = stripeService.getServerClient();

  const product = await stripe.products.update(productId, {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.metadata && { metadata: input.metadata }),
  });

  log.info('Product updated', { productId });

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    active: product.active,
    prices: [],
    metadata: product.metadata || {},
    created: product.created,
  };
}

export async function archiveProduct(productId: string): Promise<void> {
  const stripe = stripeService.getServerClient();

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
  });

  for (const price of prices.data) {
    await stripe.prices.update(price.id, { active: false });
  }

  await stripe.products.update(productId, { active: false });
  log.info('Product archived', { productId });
}

export async function createPrice(
  input: PriceCreateInput,
): Promise<StripePrice> {
  const stripe = stripeService.getServerClient();

  const price = await stripe.prices.create({
    product: input.productId,
    unit_amount: input.unitAmount,
    currency: input.currency,
    recurring: { interval: input.interval },
    metadata: input.metadata || {},
  });

  log.info('Price created', {
    priceId: price.id,
    productId: input.productId,
    amount: input.unitAmount,
  });

  return {
    id: price.id,
    productId: input.productId,
    currency: price.currency,
    unitAmount: price.unit_amount || 0,
    recurring: price.recurring
      ? {
          interval: price.recurring.interval,
          intervalCount: price.recurring.interval_count,
        }
      : null,
    active: price.active,
    metadata: price.metadata || {},
  };
}

export async function archivePrice(priceId: string): Promise<void> {
  const stripe = stripeService.getServerClient();
  await stripe.prices.update(priceId, { active: false });
  log.info('Price archived', { priceId });
}

export async function syncProductToTier(
  productId: string,
  tierCode: string,
): Promise<void> {
  const stripe = stripeService.getServerClient();

  await stripe.products.update(productId, {
    metadata: { tierCode },
  });

  const tier = await prisma.tierDefinition.findFirst({
    where: { code: tierCode },
  });

  if (tier) {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 1,
    });

    if (prices.data.length > 0) {
      await prisma.tierDefinition.update({
        where: { id: tier.id },
        data: {
          stripePriceId: prices.data[0].id,
        },
      });
    }
  }

  log.info('Product synced to tier', { productId, tierCode });
}
