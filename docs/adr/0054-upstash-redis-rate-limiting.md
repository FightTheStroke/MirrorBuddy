# ADR 0054: Upstash Redis for Distributed Rate Limiting

## Status
Accepted

## Date
2026-01-18

## Context

MirrorBuddy runs on Vercel (serverless), requiring distributed rate limiting across multiple instances. In-memory rate limiting fails in serverless due to:
1. **No shared state**: Each request may hit different container instances
2. **Rapid scaling**: Autoscaling creates/destroys instances frequently
3. **Distributed constraints**: Must enforce limits across the entire system, not per-instance

Requirements:
- HTTP-native (serverless-compatible)
- Multi-region support (global user base)
- Sliding window algorithm
- Zero deployment overhead
- Fallback for local development

## Decision

**Use Upstash Redis for production rate limiting.**

### Architecture

```typescript
// src/lib/rate-limit.ts
- Redis-based: @upstash/ratelimit with sliding window
- Fallback: In-memory for local development (no Redis configured)
- Graceful degradation: Fails safe if Redis unavailable
- Lazy init: One Ratelimit instance per config (maxRequests:windowMs)
```

### Environment Configuration

```bash
# .env.production
UPSTASH_REDIS_REST_URL=https://...redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Local development: omit these, uses in-memory
```

### Pre-configured Limits

```typescript
RATE_LIMITS = {
  CHAT: 60/min        // Expensive AI calls
  REALTIME_TOKEN: 30/min  // Voice session tokens
  HOMEWORK: 10/min    // Vision API (very expensive)
  SEARCH: 30/min
  TTS: 15/min         // Audio generation
  GENERAL: 60/min
}
```

### Implementation Details

- **Sliding window**: `Ratelimit.slidingWindow(maxRequests, windowMs)`
- **Identifier**: Authenticated users → `user:${userId}`, fallback to IP address
- **Production safeguard**: Rejects "anonymous" identifier in production
- **Async API**: `checkRateLimitAsync()` for accurate distributed checks
- **Error handling**: Falls back to memory if Redis fails

## Alternatives Considered

### Self-hosted Redis
- **Pros**: Full control, no external dependency
- **Cons**: Requires Vercel Redis integration or external service, additional ops burden

### Vercel KV
- **Pros**: First-party integration, same deployment workflow
- **Cons**: Regional limits, higher latency, less mature than Upstash

## Consequences

### Positive
- **Serverless-native**: HTTP REST API, no persistent connections required
- **Multi-region**: Upstash distributes across regions automatically
- **Zero ops**: No infrastructure to manage
- **Graceful fallback**: Works in development without setup
- **Cost effective**: Pay-per-request pricing aligns with serverless model

### Negative
- **External dependency**: Adds external service to architecture
- **Network latency**: Extra HTTP roundtrip per rate-limit check (~50-100ms)
- **Cost**: ~$0.20 per 100k requests (minimal but non-zero)
- **Vendor lock-in**: Migration requires database rewrite

### Mitigations
- Upstash is stable, trusted provider (Vercel, Supabase use it)
- Fallback to in-memory prevents complete outage
- Rate limit checks only on high-value endpoints (chat, voice)
- Monitor latency impact

## Files Changed

- `src/lib/rate-limit.ts` - Rate limiting implementation with Redis support
- `src/lib/rate-limit-types.ts` - Type definitions
- `src/lib/rate-limit-persistence.ts` - Event logging
- `.env.example` - Upstash environment variables
- `.env.production` - Production Upstash configuration

## References

- [Upstash Redis](https://upstash.com/docs/redis/overall/getstarted)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/features/ratelimiting)
- ADR 0015: Database-First Architecture
- Wave 3: Rate Limiting implementation
