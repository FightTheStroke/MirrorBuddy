# ADR 0148: Stripe Admin Panel

Status: Accepted | Date: 10 Feb 2026 | Plan: 142

## Context

MirrorBuddy needed in-app Stripe management for admin users. Previously, all Stripe operations required switching to the Stripe Dashboard, creating context-switching overhead and security concerns with sharing Dashboard access.

## Decision

Built a full Stripe admin panel within the existing admin layout. Key choices:

- **Tab architecture**: 4 tabs (Dashboard, Products, Subscriptions, Webhooks) via shadcn Tabs
- **Kill switch**: `GlobalConfig.paymentsEnabled` field controls checkout availability (503 when disabled)
- **Service-per-domain**: Separate service files (products, subscriptions, webhooks, settings) each under 250 lines
- **Audit logging**: All mutations logged via `logAdminAction()` with UPPER_SNAKE_CASE actions

## Consequences

- Positive: Centralized payment management, kill switch for emergencies, full audit trail
- Negative: Must keep services in sync with Stripe SDK version changes

## Enforcement

- Rule: `grep -q 'withAdmin' src/app/api/admin/stripe/*/route.ts`
- Check: `npx vitest run -- stripe-admin`
