# High Load Test Results (5K/10K VUs)

> Date: YYYY-MM-DD
> Environment: staging.mirrorbuddy.app
> Prerequisite: baseline-YYYY-MM-DD.md completed

## Test Matrix

| Stage  | VUs   | Duration                     | Profile   |
| ------ | ----- | ---------------------------- | --------- |
| Warmup | 1000  | 5 min                        | high-load |
| 5K     | 5000  | 15 min (5 ramp + 10 sustain) | high-load |
| 10K    | 10000 | 15 min (5 ramp + 10 sustain) | high-load |

## Expected Bottlenecks (Architecture Analysis)

### 1. Database Connection Pool (CRITICAL)

**Current**: max=5 connections, pgBouncer transaction mode
**At 5K VUs**: Pool will saturate. `mirrorbuddy_db_pool_requests_waiting > 0`
**At 10K VUs**: Connection timeouts expected (10s `connectionTimeoutMillis`)

**Mitigation**:

- Increase Supabase plan (Pro: 60 connections vs Free: 15)
- Increase `max` in `src/lib/db.ts` to 10-15
- Add read replica for analytics queries

### 2. Vercel Function Concurrency (HIGH)

**Current**: Plus plan = 12 concurrent executions
**At 5K VUs**: Function queue buildup, cold start cascade
**At 10K VUs**: 429 rate limiting from Vercel

**Mitigation**:

- Upgrade to Pro (24 concurrent)
- Optimize function duration (reduce AI call latency)
- Add caching for repeated queries

### 3. Azure OpenAI TPM Quota (HIGH)

**Current**: S0 Standard (varies by deployment)
**At 5K VUs**: TPM quota likely exceeded for chat + tools
**At 10K VUs**: 429 responses from Azure, circuit breaker triggers

**Mitigation**:

- Request quota increase (Azure portal)
- Implement response caching for common questions
- Add Ollama fallback for non-critical requests

### 4. TTS Azure Cognitive Services (MEDIUM)

**Current**: Standard tier
**At 5K VUs**: Audio generation queue, increased p99
**At 10K VUs**: Concurrent request limits

**Mitigation**:

- Pre-generate common phrases
- Implement audio caching layer (Upstash Redis)
- Reduce quality for high-load periods

## Results (5K VUs)

| Scenario    | p95 | p99 | Error Rate | Status |
| ----------- | --- | --- | ---------- | ------ |
| Health      | ms  | ms  | %          |        |
| Chat Create | ms  | ms  | %          |        |
| Chat Stream | ms  | ms  | %          |        |
| Voice TTS   | ms  | ms  | %          |        |
| Tools       | ms  | ms  | %          |        |

## Results (10K VUs)

| Scenario    | p95 | p99 | Error Rate | Status |
| ----------- | --- | --- | ---------- | ------ |
| Health      | ms  | ms  | %          |        |
| Chat Create | ms  | ms  | %          |        |
| Chat Stream | ms  | ms  | %          |        |
| Voice TTS   | ms  | ms  | %          |        |
| Tools       | ms  | ms  | %          |        |

## Optimizations Applied

1. [ ] Description + before/after metrics
2. [ ] Description + before/after metrics

## Scaling Recommendations (1K → 10K)

| Action                      | Impact          | Cost              | Priority |
| --------------------------- | --------------- | ----------------- | -------- |
| Supabase Free → Pro         | +45 connections | +25 EUR/mo        | P0       |
| Vercel Plus → Pro           | +12 concurrent  | +30 USD/mo        | P0       |
| Azure OpenAI quota increase | +TPM            | +variable         | P1       |
| Redis response cache        | -30% AI calls   | +0 (Upstash free) | P1       |
| TTS audio cache             | -50% TTS calls  | +0 (Upstash free) | P2       |

## Reference

- Scaling runbook: `docs/operations/SCALING-RUNBOOK.md`
- SLI/SLO: `docs/operations/SLI-SLO.md`
- Circuit breaker: `src/lib/resilience/circuit-breaker.ts`
