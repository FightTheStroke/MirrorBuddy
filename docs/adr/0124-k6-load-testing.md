# ADR 0124: k6 Load Testing Framework

## Status

Accepted

## Date

05 February 2026

## Context

MirrorBuddy needed a load testing framework to validate scalability
before reaching production scale. Key requirements:

1. **SLI/SLO validation** - Verify p95/p99 latency and error rates
   align with `docs/operations/SLI-SLO.md`
2. **Realistic scenarios** - Test actual user flows (chat, TTS, tools)
3. **Graduated load profiles** - From smoke (5 VUs) to stress (10K VUs)
4. **Infrastructure bottleneck identification** - DB pool, Vercel
   concurrency, Azure OpenAI quotas
5. **CI-friendly** - Smoke tests runnable in pipeline

## Decision

Adopt **k6** (Grafana Labs) as the load testing tool with four scenario
files covering all critical API endpoints.

### Why k6

- **JavaScript ES6** - Same language as the codebase
- **No runtime dependency** - Single Go binary (`brew install k6`)
- **Built-in metrics** - Trends, rates, counters with threshold checks
- **Grafana integration** - Matches existing observability stack (ADR 0047)
- **Vercel-compatible** - Tests HTTP endpoints externally

### Architecture

```
load-tests/
  config.js                    # Shared config, thresholds, stages
  scenarios/
    health.js                  # /api/health baseline
    chat-api.js                # /api/chat + /api/chat/stream
    voice-tts.js               # /api/tts
    tools-api.js               # /api/tools/* (mindmap, flashcards, quiz)
  results/
    baseline-template.md       # 100/500/1K VU result template
    high-load-template.md      # 5K/10K VU result template
```

### Load Profiles

| Profile   | VUs    | Duration | Purpose            |
| --------- | ------ | -------- | ------------------ |
| smoke     | 5      | 2 min    | Quick validation   |
| baseline  | 100-1K | 25 min   | Capacity baseline  |
| high-load | 1K-10K | 40 min   | Stress/break point |

### Thresholds (SLI/SLO aligned)

| Endpoint | p95     | p99      | Error Rate |
| -------- | ------- | -------- | ---------- |
| Health   | < 200ms | < 500ms  | < 0.1%     |
| Chat     | < 1s/5s | < 3s/10s | < 5%       |
| TTS      | < 3s    | < 8s     | < 5%       |
| Tools    | < 5s    | < 15s    | < 5%       |

### Environment Strategy

MirrorBuddy does **not** have a dedicated staging URL. Per ADR 0073,
staging uses Vercel Preview deployments with dynamic URLs per
branch/PR (`https://mirrorbuddy-git-BRANCH.vercel.app`).

- **Default BASE_URL**: `http://localhost:3000` (local dev server)
- **Preview testing**: Pass `--env BASE_URL=<vercel-preview-url>`
- **Auth**: Pass `--env AUTH_COOKIE=<signed-cookie>` for
  authenticated endpoints

## Consequences

### Positive

- **Proactive bottleneck identification** before production scale
- **Repeatable** - Same scenarios run against any environment
- **SLO compliance evidence** for stakeholders
- **Template-driven reporting** standardizes results documentation

### Negative

- **No SSE streaming validation** - k6 doesn't natively support
  Server-Sent Events; `chat/stream` tests measure full response time
- **External dependency** - Azure OpenAI quotas affect results
  (not purely infrastructure)
- **Manual execution** - Not yet integrated in CI (future: smoke
  tests on PR merge)

### Known Bottlenecks (from architecture analysis)

1. **DB Pool** (max=5) - Saturates at ~500+ concurrent DB queries
2. **Vercel concurrency** (12-24) - Queue buildup at 1K+ VUs
3. **Azure OpenAI TPM** - Rate limiting at high chat/tools volume
4. **TTS generation** - CPU-intensive, p99 degrades at scale

## Alternatives Considered

### Artillery.io

- **Pros**: YAML config, built-in scenarios
- **Cons**: Node.js runtime, heavier, less Grafana integration
- **Rejected**: k6 is lighter and matches observability stack

### Locust (Python)

- **Pros**: Distributed testing, Python flexibility
- **Cons**: Different language, requires Python runtime
- **Rejected**: JavaScript alignment preferred

### Grafana Cloud k6

- **Pros**: Managed distributed testing, dashboards
- **Cons**: Cost, vendor dependency for basic testing
- **Deferred**: Can upgrade later if distributed testing needed

## Related

- Plan 102: W2-Scalability
- ADR 0047: Grafana Cloud Observability
- ADR 0073: Staging System on Vercel
- `docs/operations/SLI-SLO.md`
- `docs/operations/SCALING-RUNBOOK.md`
- `src/lib/resilience/circuit-breaker.ts`
