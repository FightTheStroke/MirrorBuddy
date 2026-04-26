/**
 * Stripe Subscriptions Service
 *
 * Subscription management: list, cancel, refund, change plan.
 * All operations use real Stripe SDK via stripeService.getServerClient().
 */

import { logger } from '@/lib/logger';
import { stripeService } from '@/lib/stripe/stripe-service';
import type {
  StripeSubscription,
  StripeRefund,
  RefundInput,
} from './stripe-admin-types';

const log = logger.child({ module: 'stripe-subscriptions' });

export interface ListSubscriptionsParams {
  status?: string;
  email?: string;
  limit?: number;
  startingAfter?: string;
}

export interface ListSubscriptionsResult {
  subscriptions: StripeSubscription[];
  hasMore: boolean;
}

export async function listSubscriptions(
  params: ListSubscriptionsParams = {},
): Promise<ListSubscriptionsResult> {
  const stripe = stripeService.getServerClient();
  const { status, email, limit = 25, startingAfter } = params;

  let customerId: string | undefined;
  if (email) {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });
    customerId = customers.data[0]?.id;
    if (!customerId) {
      return { subscriptions: [], hasMore: false };
    }
  }

  const listParams: import('stripe').Stripe.SubscriptionListParams = {
    limit,
    expand: ['data.customer'],
    status: (status as import('stripe').Stripe.SubscriptionListParams.Status) ||
      'all',
    ...(customerId && { customer: customerId }),
    ...(startingAfter && { starting_after: startingAfter }),
  };

  const res = await stripe.subscriptions.list(listParams);

  const subscriptions = res.data.map(mapSubscription);
  return { subscriptions, hasMore: res.has_more };
}

export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true,
): Promise<StripeSubscription> {
  const stripe = stripeService.getServerClient();

  let sub: import('stripe').Stripe.Subscription;
  if (cancelAtPeriodEnd) {
    sub = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    sub = await stripe.subscriptions.cancel(subscriptionId);
  }

  log.info('Subscription canceled', {
    subscriptionId,
    cancelAtPeriodEnd,
    newStatus: sub.status,
  });

  return mapSubscription(sub);
}

export async function issueRefund(input: RefundInput): Promise<StripeRefund> {
  const stripe = stripeService.getServerClient();

  const refund = await stripe.refunds.create({
    charge: input.chargeId,
    ...(input.amount && { amount: input.amount }),
    ...(input.reason && { reason: input.reason }),
  });

  log.info('Refund issued', {
    refundId: refund.id,
    chargeId: input.chargeId,
    amount: refund.amount,
  });

  return {
    id: refund.id,
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status as StripeRefund['status'],
    reason: refund.reason,
    chargeId:
      typeof refund.charge === 'string' ? refund.charge : refund.charge?.id || '',
    created: refund.created,
    metadata: refund.metadata || {},
  };
}

export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string,
): Promise<StripeSubscription> {
  const stripe = stripeService.getServerClient();

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = sub.items.data[0]?.id;

  if (!itemId) {
    throw new Error('Subscription has no items');
  }

  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: 'create_prorations',
    expand: ['customer'],
  });

  log.info('Subscription plan changed', {
    subscriptionId,
    newPriceId,
  });

  return mapSubscription(updated);
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
