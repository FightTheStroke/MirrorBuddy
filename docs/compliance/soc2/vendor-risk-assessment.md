# Vendor Risk Assessment

> SOC 2 Trust Service Criteria: CC9.2
> Last Updated: 2026-02-06
> Owner: Engineering Lead

## Sub-Processor Registry

| Vendor   | Service               | Data Processed         | SOC 2   | DPA |
| -------- | --------------------- | ---------------------- | ------- | --- |
| Azure    | AI (OpenAI)           | Conversation content   | Type II | Yes |
| Supabase | Database (PostgreSQL) | All user data          | Type II | Yes |
| Vercel   | Hosting, CDN          | Application code, logs | Type II | Yes |
| Upstash  | Redis cache           | Session data, cache    | Type II | Yes |
| Resend   | Transactional email   | Email addresses        | Type II | Yes |
| Sentry   | Error tracking        | Error context, PII     | Type II | Yes |
| Stripe   | Payments              | Payment info           | PCI DSS | Yes |

## Data Residency

| Vendor   | Region         | Encryption at Rest | Encryption in Transit |
| -------- | -------------- | ------------------ | --------------------- |
| Azure    | West Europe    | AES-256            | TLS 1.2+              |
| Supabase | EU (Frankfurt) | AES-256            | TLS 1.2+              |
| Vercel   | EU (Frankfurt) | AES-256            | TLS 1.2+              |
| Upstash  | EU (Frankfurt) | AES-256            | TLS 1.2+              |
| Resend   | US             | AES-256            | TLS 1.2+              |
| Sentry   | US             | AES-256            | TLS 1.2+              |
| Stripe   | PCI compliant  | AES-256            | TLS 1.2+              |

## Risk Assessment per Vendor

### Azure (OpenAI Service)

- **Risk Level**: Medium
- **Data**: Conversation content sent for AI processing
- **Mitigations**: Content not used for training (opt-out), EU data residency
- **DPA**: Microsoft Online Services DPA

### Supabase (PostgreSQL)

- **Risk Level**: High (primary data store)
- **Data**: All user records, conversations, school data
- **Mitigations**: Row-level security, encrypted backups, EU hosting
- **DPA**: Supabase DPA v2

### Vercel (Hosting)

- **Risk Level**: Low
- **Data**: Application code, access logs
- **Mitigations**: Edge functions in EU, no persistent PII storage
- **DPA**: Vercel DPA

### Upstash (Redis)

- **Risk Level**: Low
- **Data**: Cache data, rate limit counters, session state
- **Mitigations**: TTL-based auto-expiry, EU hosting
- **DPA**: Upstash DPA

### Resend (Email)

- **Risk Level**: Low
- **Data**: Email addresses for transactional emails
- **Mitigations**: Minimal data retention, no marketing emails
- **DPA**: Resend DPA

### Sentry (Error Tracking)

- **Risk Level**: Medium
- **Data**: Error context including potential PII in stack traces
- **Mitigations**: PII scrubbing enabled, 90-day retention
- **DPA**: Sentry DPA

### Stripe (Payments)

- **Risk Level**: Low (Stripe handles all payment data)
- **Data**: Payment method tokens (no raw card data stored)
- **Mitigations**: PCI DSS Level 1, tokenization
- **DPA**: Stripe DPA

## Review Schedule

- Annual review of all vendor SOC 2 reports
- Quarterly check of vendor security advisories
- Immediate review on vendor breach notification
