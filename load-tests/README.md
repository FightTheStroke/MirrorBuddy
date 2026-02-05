# Load Testing - MirrorBuddy

k6 load test scenarios for scalability validation.

## Prerequisites

```bash
brew install k6
```

## Scenarios

| Scenario       | Endpoint                        | Purpose                 |
| -------------- | ------------------------------- | ----------------------- |
| `health.js`    | `/api/health`                   | Infrastructure baseline |
| `chat-api.js`  | `/api/chat`, `/api/chat/stream` | Chat + streaming load   |
| `voice-tts.js` | `/api/tts`                      | TTS generation load     |
| `tools-api.js` | `/api/tools/*`                  | AI tool generation load |

## Profiles

- **smoke**: 5 VUs, 2 min (quick validation)
- **baseline**: 100 → 500 → 1K VUs, 25 min (capacity baseline)
- **high-load**: 1K → 5K → 10K VUs, 40 min (stress test)

## Usage

```bash
# Smoke test (quick)
k6 run --env BASE_URL=https://staging.mirrorbuddy.app \
       --env PROFILE=smoke \
       scenarios/health.js

# Baseline (requires auth for chat/tools)
k6 run --env BASE_URL=https://staging.mirrorbuddy.app \
       --env AUTH_COOKIE=your-signed-cookie \
       scenarios/chat-api.js

# All scenarios in sequence
for scenario in health chat-api voice-tts tools-api; do
  k6 run --env BASE_URL=https://staging.mirrorbuddy.app \
         --env AUTH_COOKIE=your-signed-cookie \
         scenarios/${scenario}.js \
         --out json=results/${scenario}.json
done
```

## Thresholds (SLI/SLO aligned)

| Metric      | Health  | Chat                          | TTS  | Tools |
| ----------- | ------- | ----------------------------- | ---- | ----- |
| p95 latency | < 200ms | < 1s (create), < 5s (stream)  | < 3s | < 5s  |
| p99 latency | < 500ms | < 3s (create), < 10s (stream) | < 8s | < 15s |
| Error rate  | < 0.1%  | < 5%                          | < 5% | < 5%  |

## Results

Results are documented in `results/` directory after each test run.

## Architecture Notes

- **Database**: PostgreSQL (Supabase) with pgBouncer pooling (port 6543)
- **Pool**: max=5 connections (serverless optimized)
- **Circuit breaker**: `src/lib/resilience/circuit-breaker.ts`
- **Scaling runbook**: `docs/operations/SCALING-RUNBOOK.md`
