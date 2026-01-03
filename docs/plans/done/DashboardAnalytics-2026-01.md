# Dashboard Analytics Enhancement Plan

**Data**: 2026-01-02
**Status**: ✅ COMPLETATO (core functionality)
**Owner**: Roberto
**Priority**: Media
**Estimated Effort**: ~27h (parallelizzabile)

> **Note**: Core dashboard implemented with all 5 API endpoints and UI. Voice latency instrumentation (firstByteMs, etc.) deferred as "nice to have".

---

## Executive Summary

Aggiungere metriche avanzate al Settings Dashboard per monitorare:
- Token consumption per provider (costi Azure vs Ollama)
- Voice session latency (critico per UX)
- Rate limit hits
- FSRS review patterns
- Safety filter events

---

## Current State Analysis

### What Exists

| Component | State | Gap |
|-----------|-------|-----|
| Token tracking | ✅ Per-message `Message.tokenCount` | No aggregation by provider |
| Voice latency | ❌ Only duration tracked | No `firstByteMs`, `responseTimeMs` |
| Rate limiting | ⚠️ In-memory only | No persistence, lost on restart |
| FSRS state | ✅ `FlashcardProgress` tracked | No aggregation API |
| Safety monitoring | ⚠️ In-memory buffer (max 1000) | Lost on restart |

### Infrastructure Already Present

- `TelemetryEvent` Prisma model exists
- `/api/telemetry` endpoints exist
- `telemetry-dashboard.tsx` exists in settings
- Prometheus-style `/api/metrics` endpoint exists

---

## Implementation Tasks

### 1. Token Consumption per Provider (Azure vs Ollama)

**Effort**: 6h

- [ ] **1.1** API aggregazione token usage `GET /api/analytics/token-usage`
  - Aggregare `Message.tokenCount` per data, maestro, model
  - Stima costi usando rate configurabili (Azure vs Ollama diversi)
  - Return: total tokens, estimated cost, breakdown by provider

- [ ] **1.2** Dashboard card "Cost Metrics"
  - Daily token spend trend chart
  - Estimated monthly burn
  - Cost per study hour
  - Provider breakdown (pie chart)

### 2. Voice Session Latency (Critical for UX)

**Effort**: 8h

- [ ] **2.1** Instrumentare `use-voice-session.ts` per tracciare:
  - `firstByteMs` - tempo prima risposta
  - `responseTimeMs` - latenza media
  - `connectionLatency` - tempo connessione WebSocket
  - `qualityScore` - punteggio qualità 0-1

- [ ] **2.2** Logging via TelemetryEvent category 'performance'
  ```typescript
  {
    category: 'performance',
    action: 'voice_response_time',
    value: 245,
    metadata: {
      firstByteMs: 120,
      quality: 'good',
      provider: 'azure'
    }
  }
  ```

- [ ] **2.3** API `GET /api/analytics/voice-metrics`
  - Avg first-byte latency
  - P95 response time
  - Connection quality distribution
  - Error rate %

- [ ] **2.4** Dashboard card "Voice Quality"
  - Latency trend line chart
  - Quality score gauge
  - Error rate indicator

### 3. Rate Limit Tracking

**Effort**: 4h

**Problema**: Attualmente in-memory (`src/lib/rate-limit.ts`), nessun storico

- [ ] **3.1** Aggiungere tabella `RateLimitEvent` a Prisma schema
  ```prisma
  model RateLimitEvent {
    id        String   @id @default(cuid())
    userId    String?
    endpoint  String   // /api/chat, /api/tts, etc
    limit     Int
    window    Int      // seconds
    ipAddress String?
    timestamp DateTime @default(now())
    @@index([userId, timestamp])
    @@index([endpoint, timestamp])
  }
  ```

- [ ] **3.2** Modificare `rate-limit.ts` per persistere eventi

- [ ] **3.3** API `GET /api/analytics/rate-limits?period=7d`
  - totalHits
  - byEndpoint
  - peakHours
  - affectedUsers

- [ ] **3.4** Dashboard card "Rate Limiting" (admin only)
  - Total hits (7d)
  - Most throttled endpoints
  - Peak traffic hours

### 4. FSRS Review Patterns

**Effort**: 3h

**Problema**: Card state tracciato ma nessuna aggregazione/visualizzazione

- [ ] **4.1** API `GET /api/analytics/fsrs-stats?deckId=chemistry`
  - Query `FlashcardProgress`
  - Calcolare retention curves
  - Return:
    - total/mastered/learning cards
    - difficulty distribution
    - Retention curve: % recall at days 1, 7, 30, 90
    - Cards due forecasting

- [ ] **4.2** Dashboard card "FSRS Performance"
  - Cards due today/this week
  - Mastery rate by deck
  - Retention curve mini-chart
  - Most challenging topics

### 5. Safety Filter Events

**Effort**: 6h

**Problema**: In-memory buffer (`src/lib/safety/monitoring.ts`), perso al restart

- [ ] **5.1** Aggiungere tabella `SafetyEvent` a Prisma schema
  ```prisma
  model SafetyEvent {
    id              String   @id @default(cuid())
    userId          String?
    type            String   // input_blocked, crisis_detected, jailbreak_attempt
    severity        String   // info, warning, alert, critical
    conversationId  String?
    resolvedBy      String?
    resolvedAt      DateTime?
    resolution      String?
    timestamp       DateTime @default(now())
    @@index([userId, timestamp])
    @@index([severity, timestamp])
  }
  ```

- [ ] **5.2** Modificare `monitoring.ts` per persistere eventi

- [ ] **5.3** API `GET /api/analytics/safety-events?period=30d`
  - totalEvents
  - bySeverity
  - byType
  - events list (paginated)

- [ ] **5.4** Dashboard card "Safety Summary" (admin only)
  - Total violations (7d)
  - Critical events count
  - Most common types
  - Unresolved alerts

---

## Nice to Have (Phase 2)

- [ ] Provider failover tracking (Azure → Ollama)
- [ ] Conversation memory efficiency (summary extraction success rate)
- [ ] Tool creation success rate and performance
- [ ] Maestro popularity ranking
- [ ] Study session heatmap (hours of day/day of week)

---

## Effort Summary

| Task | Time | Dependencies |
|------|------|--------------|
| Token usage API + UI | 6h | Use existing Message.tokenCount |
| Voice metrics instrumentation + UI | 8h | Modify use-voice-session.ts |
| FSRS stats API + UI | 3h | Query FlashcardProgress |
| Rate limit persistence + UI | 4h | Add schema + update rate-limit.ts |
| Safety persistence + UI | 6h | Add schema + integrate monitoring.ts |
| **Total** | **27h** | Can be parallelized in 3 tracks |

---

## Parallelization Strategy

```
TRACK A: Data Layer (12h)
├── Token aggregation API
├── Voice metrics instrumentation
└── FSRS stats API

TRACK B: Persistence (10h)
├── RateLimitEvent schema + migration
├── SafetyEvent schema + migration
└── Update monitoring.ts and rate-limit.ts

TRACK C: UI (8h)
├── Token usage card
├── Voice quality card
├── FSRS performance card
├── Rate limiting card (admin)
└── Safety summary card (admin)
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add RateLimitEvent, SafetyEvent models |
| `src/lib/rate-limit.ts` | Add DB persistence |
| `src/lib/safety/monitoring.ts` | Add DB persistence |
| `src/lib/hooks/use-voice-session.ts` | Add latency instrumentation |
| `src/app/api/analytics/*` | New API routes |
| `src/app/settings/components/telemetry-dashboard.tsx` | Add new cards |

---

## Acceptance Criteria

- [ ] All 5 metric categories visible in dashboard
- [ ] Data persists across server restarts
- [ ] Admin-only cards require authentication
- [ ] Charts render correctly on mobile
- [ ] Performance: dashboard loads in < 2s

---

**Autore**: Claude Opus 4.5
**Versione**: 1.0
**Creato**: 2026-01-02
