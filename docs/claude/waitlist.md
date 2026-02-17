# Waitlist & Coming Soon — Architecture

**ADR**: 0158 | **Plan**: 157 | **Feature Flag**: `coming_soon_overlay`

## Overview

Pre-launch waitlist system with GDPR double opt-in, promo codes, admin dashboard, and automated cleanup.

## Signup Flow

```mermaid
sequenceDiagram
    participant U as User
    participant P as Proxy
    participant CS as /coming-soon
    participant API as /api/waitlist/signup
    participant WS as WaitlistService
    participant DB as PostgreSQL
    participant E as Email Service

    U->>P: GET /
    P->>P: Check coming_soon_overlay flag
    P->>CS: Redirect (flag enabled)
    CS->>U: Coming Soon page + form
    U->>API: POST {email, gdprConsent}
    API->>WS: signup(params)
    WS->>DB: Create WaitlistEntry
    WS->>E: Send verification email
    WS-->>API: entry
    API-->>U: 201 {success: true}
```

## Verification & Promo Flow

```mermaid
sequenceDiagram
    participant U as User
    participant V as /api/waitlist/verify
    participant WS as WaitlistService
    participant DB as PostgreSQL
    participant E as Email Service
    participant R as /api/promo/redeem
    participant PS as PromoService

    U->>V: GET ?token=xxx
    V->>WS: verify(token)
    WS->>DB: Update verifiedAt, generate promoCode
    WS->>E: Send confirmation + promo code
    V-->>U: Redirect to /waitlist/verify (success page)

    Note over U: After platform launch
    U->>R: POST {code: "ABC12345"}
    R->>PS: redeemCode(code, userId)
    PS->>DB: $transaction: update WaitlistEntry + upsert UserSubscription
    PS->>DB: Create TierAuditLog (PROMO_REDEEM)
    R-->>U: 200 {success, subscription}
```

## Data Model

```mermaid
erDiagram
    WaitlistEntry {
        string id PK
        string email UK
        string locale
        string source
        datetime gdprConsentAt
        string gdprConsentVersion
        boolean marketingConsent
        string verificationToken UK
        datetime verifiedAt
        string unsubscribeToken UK
        datetime unsubscribedAt
        string promoCode UK
        datetime promoRedeemedAt
        string convertedUserId
    }
    UserSubscription {
        string id PK
        string userId UK
        string tierId FK
        string status
        datetime expiresAt
    }
    TierAuditLog {
        string id PK
        string userId
        string adminId
        string action
        json changes
    }
    WaitlistEntry ||--o| UserSubscription : "converts to"
    WaitlistEntry ||--o| TierAuditLog : "audit trail"
```

## API Routes

| Method | Path                         | Auth                | Description              |
| ------ | ---------------------------- | ------------------- | ------------------------ |
| POST   | `/api/waitlist/signup`       | Public + rate limit | Create waitlist entry    |
| GET    | `/api/waitlist/verify`       | Public (token)      | Verify email             |
| GET    | `/api/waitlist/unsubscribe`  | Public (token)      | Unsubscribe              |
| POST   | `/api/promo/redeem`          | Auth + rate limit   | Redeem promo code        |
| GET    | `/api/admin/waitlist`        | Admin               | List entries (paginated) |
| GET    | `/api/admin/waitlist/stats`  | Admin               | Aggregate stats          |
| POST   | `/api/cron/waitlist-cleanup` | CRON_SECRET         | Delete unverified >90d   |

## Metrics (Grafana)

| Metric                          | Description          |
| ------------------------------- | -------------------- |
| `waitlist_signups_total`        | Total signups        |
| `waitlist_verified_total`       | Verified emails      |
| `waitlist_unsubscribed_total`   | Unsubscribed         |
| `waitlist_promo_redeemed_total` | Promo codes redeemed |
| `waitlist_conversion_rate`      | Converted / total    |

## Key Files

| File                                           | Purpose                                    |
| ---------------------------------------------- | ------------------------------------------ |
| `src/lib/waitlist/waitlist-service.ts`         | Core service (signup, verify, unsubscribe) |
| `src/lib/promo/promo-service.ts`               | Promo validation + redemption              |
| `src/components/coming-soon/waitlist-form.tsx` | Signup form component                      |
| `src/app/[locale]/coming-soon/page.tsx`        | Coming Soon page                           |
| `src/lib/email/campaign-service.ts`            | Dual-source campaigns                      |
| `src/app/api/cron/waitlist-cleanup/route.ts`   | Cleanup cron                               |
| `prisma/schema/waitlist.prisma`                | Data model                                 |
