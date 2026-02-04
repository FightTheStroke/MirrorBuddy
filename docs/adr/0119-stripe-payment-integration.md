# ADR 0119: Stripe Payment Integration

## Status

Accepted

## Date

2026-02-04

## Context

MirrorBuddy requires a production-grade payment system to monetize the tier subscription model (ADR 0071). The system must:

1. Handle subscription checkout with automatic tax calculation
2. Process webhooks for subscription lifecycle events
3. Provide customer portal for self-service management
4. Implement dunning for failed payments with grace period
5. Support EU VAT/tax compliance per country
6. Provide revenue analytics (MRR, ARR, churn, LTV)
7. Enable admin management of pricing and tax rates

## Decision

Implement Stripe as the payment provider with the following architecture:

### 1. StripeService Singleton

Central service for all Stripe operations (`src/lib/stripe/stripe-service.ts`):

```typescript
class StripeService {
  // Checkout
  createCheckoutSession(
    params: CheckoutParams,
  ): Promise<Stripe.Checkout.Session>;

  // Customer Portal
  createCustomerPortalSession(
    params: PortalParams,
  ): Promise<Stripe.BillingPortal.Session>;

  // Webhook verification
  constructWebhookEvent(
    payload: string,
    signature: string,
  ): Promise<Stripe.Event>;

  // Product/Price sync
  syncProduct(params: ProductParams): Promise<Stripe.Product>;
  syncPrice(params: PriceParams): Promise<Stripe.Price>;
}
```

### 2. Webhook Handler

POST `/api/webhooks/stripe` processes:

| Event                           | Action                                  |
| ------------------------------- | --------------------------------------- |
| `checkout.session.completed`    | Activate subscription, link Stripe IDs  |
| `customer.subscription.updated` | Update status (active/paused/cancelled) |
| `customer.subscription.deleted` | Downgrade to Base tier                  |
| `invoice.payment_failed`        | Start 7-day grace period                |

### 3. Dunning Service

Handles failed payments (`src/lib/stripe/dunning-service.ts`):

- **Day 1**: Payment fails → subscription paused, first email
- **Day 3**: Reminder email
- **Day 7**: Final notice email
- **After Day 7**: Auto-downgrade to Base tier

Grace period stored in `UserSubscription.expiresAt`.

### 4. Tax Configuration

Per-country VAT rates (`TaxConfig` model):

```prisma
model TaxConfig {
  id                   String   @id @default(cuid())
  countryCode          String   @unique  // IT, FR, DE, ES, GB
  vatRate              Float    @default(0)
  reverseChargeEnabled Boolean  @default(false)
  stripeTaxId          String?  // Stripe Tax Rate ID
  isActive             Boolean  @default(true)
}
```

Admin syncs rates to Stripe via `stripe.taxRates.create()`.

### 5. Admin Pages

| Page                         | Purpose                               |
| ---------------------------- | ------------------------------------- |
| `/admin/tiers/new`           | Create tier with Stripe product/price |
| `/admin/tiers/[id]/edit`     | Edit tier, soft delete                |
| `/admin/tiers/[id]/features` | Feature flags + AI model assignment   |
| `/admin/tiers/[id]/pricing`  | Pricing + Stripe sync                 |
| `/admin/tax`                 | EU VAT configuration                  |
| `/admin/revenue`             | MRR, ARR, churn, LTV dashboard        |

### 6. Revenue Dashboard Metrics

Calculated from `UserSubscription` and `TierDefinition`:

- **MRR**: Sum of active subscriptions × monthly price
- **ARR**: MRR × 12
- **Churn Rate**: Cancelled / Total active (30-day window)
- **LTV**: Average revenue per customer over lifetime
- **Trends**: Month-over-month comparison

### 7. API Endpoints

| Endpoint               | Method | Auth | Purpose                              |
| ---------------------- | ------ | ---- | ------------------------------------ |
| `/api/checkout`        | POST   | User | Create checkout session              |
| `/api/billing/portal`  | POST   | User | Create portal session                |
| `/api/webhooks/stripe` | POST   | None | Webhook handler (signature verified) |

### 8. Security

- CSRF protection on checkout/portal endpoints
- Webhook signature verification via `stripe.webhooks.constructEvent()`
- No Stripe keys in client code (server-side only)
- Audit logging for all admin pricing changes

## Consequences

### Positive

1. **Full lifecycle**: Checkout → active → renewal → churn handled
2. **Self-service**: Customer portal reduces support burden
3. **Compliance**: Automatic tax calculation for EU
4. **Resilience**: Dunning gives users time to fix payment issues
5. **Analytics**: Revenue metrics for business decisions
6. **Admin control**: Full pricing management without deploys

### Negative

1. **Vendor lock-in**: Stripe-specific implementation
2. **Complexity**: Multiple webhook events to handle
3. **Cost**: Stripe fees (2.9% + €0.25 per transaction)
4. **Testing**: Requires Stripe test mode for E2E

### Mitigations

1. **Abstraction**: StripeService isolates vendor specifics
2. **Idempotency**: Webhook handlers are idempotent
3. **Monitoring**: Failed webhook alerts via Sentry
4. **Test mode**: E2E uses Stripe test keys

## Files

### Service Layer

- `src/lib/stripe/stripe-service.ts` - Main Stripe client
- `src/lib/stripe/dunning-service.ts` - Failed payment handling
- `src/lib/stripe/index.ts` - Export barrel

### API Routes

- `src/app/api/checkout/route.ts` - Checkout session
- `src/app/api/billing/portal/route.ts` - Customer portal
- `src/app/api/webhooks/stripe/route.ts` - Webhook handler

### Admin Pages

- `src/app/[locale]/admin/tiers/new/page.tsx` - Create tier
- `src/app/[locale]/admin/tiers/[id]/edit/page.tsx` - Edit tier
- `src/app/[locale]/admin/tiers/[id]/features/page.tsx` - Features
- `src/app/[locale]/admin/tiers/[id]/pricing/page.tsx` - Pricing
- `src/app/[locale]/admin/tax/page.tsx` - Tax config
- `src/app/[locale]/admin/revenue/page.tsx` - Revenue dashboard

### Schema

- `prisma/schema/tier.prisma` - TaxConfig model added

### Tests

- `src/lib/stripe/__tests__/stripe-service.test.ts` - Unit tests
- `src/lib/stripe/__tests__/dunning-service.test.ts` - Dunning tests
- `src/app/api/webhooks/stripe/__tests__/route.test.ts` - Webhook tests
- `src/app/api/checkout/__tests__/route.test.ts` - Checkout tests
- `src/app/api/billing/portal/__tests__/route.test.ts` - Portal tests
- `e2e/stripe-checkout.spec.ts` - E2E checkout flow
- `e2e/stripe-admin.spec.ts` - E2E admin billing

## Related

- ADR 0071: Tier Subscription System - Data model and tier logic
- ADR 0073: Per-Feature Model Selection - AI model per tier
- Plan 101: W1-Payments - Implementation plan

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_... (for dunning emails)
```
