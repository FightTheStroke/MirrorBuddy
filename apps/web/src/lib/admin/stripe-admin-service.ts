/**
 * Stripe Admin Service
 *
 * Service layer for Stripe admin dashboard data.
 * Uses real Stripe SDK via stripeService.getServerClient().
 * Ref: ADR 0119
 */

import { logger } from '@/lib/logger';
import { stripeService } from '@/lib/stripe/stripe-service';
import type {
  StripeAdminResponse,
  StripeProduct,
  StripePrice,
  StripeSubscription,
  StripeRevenue,
} from './stripe-admin-types';

const log = logger.child({ module: 'stripe-admin' });

function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function emptyResponse(error?: string): StripeAdminResponse {
  return {
    configured: false,
    products: [],
    subscriptions: [],
    revenue: null,
    refunds: [],
    ...(error ? { error } : {}),
  };
}

export async function getDashboardData(): Promise<StripeAdminResponse> {
  if (!isStripeConfigured()) {
    log.info('Stripe not configured');
    return emptyResponse();
  }

  try {
    const stripe = stripeService.getServerClient();

    const [productsRes, subsRes, balanceRes] = await Promise.all([
      stripe.products.list({ limit: 100, expand: ['data.default_price'] }),
      stripe.subscriptions.list({
        limit: 100,
        expand: ['data.customer'],
        status: 'all',
      }),
      stripe.balance.retrieve(),
    ]);

    const products = productsRes.data.map(mapProduct);
    const subscriptions = subsRes.data.map(mapSubscription);
    const revenue = computeRevenue(subscriptions, balanceRes);

    return {
      configured: true,
      products,
      subscriptions,
      revenue,
      refunds: [],
    };
  } catch (error) {
    log.error('Error fetching dashboard data', { error: String(error) });
    return emptyResponse('Failed to fetch Stripe data');
  }
}

export async function getProducts(): Promise<StripeProduct[]> {
  if (!isStripeConfigured()) return [];

  try {
    const stripe = stripeService.getServerClient();
    const res = await stripe.products.list({
      limit: 100,
      expand: ['data.default_price'],
    });

    const pricesRes = await stripe.prices.list({
      limit: 100,
      active: true,
    });

    const pricesByProduct = new Map<string, StripePrice[]>();
    for (const p of pricesRes.data) {
      const productId =
        typeof p.product === 'string' ? p.product : p.product.id;
      const existing = pricesByProduct.get(productId) || [];
      existing.push(mapPrice(p));
      pricesByProduct.set(productId, existing);
    }

    return res.data.map((p) => ({
      ...mapProduct(p),
      prices: pricesByProduct.get(p.id) || mapProduct(p).prices,
    }));
  } catch (error) {
    log.error('Error fetching products', { error: String(error) });
    return [];
  }
}

export async function getSubscriptions(): Promise<StripeSubscription[]> {
  if (!isStripeConfigured()) return [];

  try {
    const stripe = stripeService.getServerClient();
    const res = await stripe.subscriptions.list({
      limit: 100,
      expand: ['data.customer'],
      status: 'all',
    });
    return res.data.map(mapSubscription);
  } catch (error) {
    log.error('Error fetching subscriptions', { error: String(error) });
    return [];
  }
}

function mapProduct(p: import('stripe').Stripe.Product): StripeProduct {
  const defaultPrice = p.default_price;
  const prices: StripePrice[] = [];

  if (defaultPrice && typeof defaultPrice !== 'string') {
    prices.push(mapPrice(defaultPrice));
  }

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    active: p.active,
    prices,
    metadata: p.metadata || {},
    created: p.created,
  };
}

function mapPrice(p: import('stripe').Stripe.Price): StripePrice {
  return {
    id: p.id,
    productId: typeof p.product === 'string' ? p.product : p.product.id,
    currency: p.currency,
    unitAmount: p.unit_amount || 0,
    recurring: p.recurring
      ? {
          interval: p.recurring.interval,
          intervalCount: p.recurring.interval_count,
        }
      : null,
    active: p.active,
    metadata: p.metadata || {},
  };
}

function mapSubscription(
  s: import('stripe').Stripe.Subscription,
): StripeSubscription {
  const customer = s.customer;
  const email =
    typeof customer !== 'string' && 'email' in customer
      ? customer.email
      : null;

  const firstItem = s.items.data[0];
  const periodStart = firstItem?.current_period_start ?? s.created;
  const periodEnd = firstItem?.current_period_end ?? s.created;

  return {
    id: s.id,
    customerId: typeof customer === 'string' ? customer : customer.id,
    customerEmail: email,
    status: s.status as StripeSubscription['status'],
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: s.cancel_at_period_end,
    items: s.items.data.map((item) => ({
      priceId: typeof item.price === 'string' ? item.price : item.price.id,
      quantity: item.quantity || 1,
    })),
    metadata: s.metadata || {},
    created: s.created,
  };
}

function computeRevenue(
  subscriptions: StripeSubscription[],
  balance: import('stripe').Stripe.Balance,
): StripeRevenue {
  const now = Math.floor(Date.now() / 1000);
  const monthAgo = now - 30 * 24 * 60 * 60;

  const active = subscriptions.filter((s) => s.status === 'active');
  const canceledThisMonth = subscriptions.filter(
    (s) => s.status === 'canceled' && s.created >= monthAgo,
  ).length;
  const newThisMonth = active.filter((s) => s.created >= monthAgo).length;

  const mrr = active.reduce((sum, s) => {
    for (const item of s.items) {
      sum += item.quantity * 999; // Default Pro price in cents
    }
    return sum;
  }, 0);

  const available = balance.available?.[0]?.amount || 0;

  return {
    mrr,
    arr: mrr * 12,
    totalRevenue: available,
    activeSubscriptions: active.length,
    canceledThisMonth,
    newThisMonth,
    currency: 'eur',
  };
}

export function formatCurrency(
  cents: number,
  currency: string = 'EUR',
): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
