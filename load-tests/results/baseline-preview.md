# Baseline Load Test Results (Vercel Preview)

> Date: 2026-02-06
> Environment: Vercel Preview (pending deployment)
> k6 version: (pending)
> Operator: Claude Code (automated)
> Status: PENDING EXECUTION

## Test Matrix

| Stage | VUs  | Duration                    | Profile  |
| ----- | ---- | --------------------------- | -------- |
| 1     | 100  | 5 min (2 ramp + 3 sustain)  | baseline |
| 2     | 500  | 8 min (3 ramp + 5 sustain)  | baseline |
| 3     | 1000 | 10 min (5 ramp + 5 sustain) | baseline |

## How to Execute

```bash
# Deploy preview first
vercel --prebuilt

# Run baseline suite
PREVIEW_URL=https://mirrorbuddy-xxx.vercel.app
k6 run -e BASE_URL=$PREVIEW_URL load-tests/scenarios/health.js
k6 run -e BASE_URL=$PREVIEW_URL load-tests/scenarios/chat-api.js
k6 run -e BASE_URL=$PREVIEW_URL load-tests/scenarios/voice-tts.js
k6 run -e BASE_URL=$PREVIEW_URL load-tests/scenarios/tools-api.js
```

## Results

Pending execution against Vercel preview deployment.

## SLO Targets

| Endpoint | p95 Latency | Error Rate |
| -------- | ----------- | ---------- |
| Health   | < 200ms     | < 0.1%     |
| Chat     | < 1000ms    | < 5%       |
| Voice    | < 3000ms    | < 5%       |
| Tools    | < 5000ms    | < 5%       |
