/**
 * Stripe Webhooks Service
 *
 * Webhook event monitoring: list, detail, retry.
 * Uses Stripe SDK stripe.events.list().
 */

import { logger } from '@/lib/logger';
import { stripeService } from '@/lib/stripe/stripe-service';
import type { StripeWebhookEvent } from './stripe-admin-types';

const log = logger.child({ module: 'stripe-webhooks' });

export interface ListWebhookEventsParams {
  limit?: number;
  startingAfter?: string;
  type?: string;
}

export interface ListWebhookEventsResult {
  events: StripeWebhookEvent[];
  hasMore: boolean;
}

export async function listWebhookEvents(
  params: ListWebhookEventsParams = {},
): Promise<ListWebhookEventsResult> {
  const stripe = stripeService.getServerClient();
  const { limit = 25, startingAfter, type } = params;

  const res = await stripe.events.list({
    limit,
    ...(startingAfter && { starting_after: startingAfter }),
    ...(type && { type }),
  });

  const events: StripeWebhookEvent[] = res.data.map(mapEvent);
  return { events, hasMore: res.has_more };
}

export async function getEventDetail(
  eventId: string,
): Promise<StripeWebhookEvent> {
  const stripe = stripeService.getServerClient();
  const event = await stripe.events.retrieve(eventId);
  return mapEvent(event);
}

export async function retryEvent(eventId: string): Promise<void> {
  const stripe = stripeService.getServerClient();
  const event = await stripe.events.retrieve(eventId);

  log.info('Webhook event retry requested', {
    eventId,
    type: event.type,
    pendingWebhooks: event.pending_webhooks,
  });

  // Stripe doesn't have a direct retry API for events.
  // We re-fetch and log for manual investigation.
  // The admin can use Stripe Dashboard for full retry capability.
  log.warn('Manual retry: use Stripe Dashboard for full webhook retry', {
    eventId,
  });
}

function mapEvent(
  e: import('stripe').Stripe.Event,
): StripeWebhookEvent {
  return {
    id: e.id,
    type: e.type,
    created: e.created,
    livemode: e.livemode,
    pendingWebhooks: e.pending_webhooks,
    request: e.request
      ? {
          id: e.request.id,
          idempotencyKey: e.request.idempotency_key,
        }
      : null,
    data: e.data as unknown as Record<string, unknown>,
  };
}
