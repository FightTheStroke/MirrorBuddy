# Smoke Load Test Results (Local)

> Date: 2026-02-06
> Environment: localhost:3000
> k6 version: (pending)
> Operator: Claude Code (automated)
> Status: PENDING EXECUTION

## Test Configuration

| Scenario  | VUs | Duration | Script                 |
| --------- | --- | -------- | ---------------------- |
| Health    | 5   | 2 min    | scenarios/health.js    |
| Chat API  | 5   | 2 min    | scenarios/chat-api.js  |
| Voice TTS | 5   | 2 min    | scenarios/voice-tts.js |
| Tools API | 5   | 2 min    | scenarios/tools-api.js |

## How to Execute

```bash
# Start local dev server first
npm run dev

# Run all smoke tests
k6 run --vus 5 --duration 2m load-tests/scenarios/health.js
k6 run --vus 5 --duration 2m load-tests/scenarios/chat-api.js
k6 run --vus 5 --duration 2m load-tests/scenarios/voice-tts.js
k6 run --vus 5 --duration 2m load-tests/scenarios/tools-api.js
```

## Results

Pending execution against local server.

## Pass/Fail Criteria

- Health: p95 < 200ms, error < 0.1%
- Chat: p95 < 1000ms, error < 5%
- Voice: p95 < 3000ms, error < 5%
- Tools: p95 < 5000ms, error < 5%
