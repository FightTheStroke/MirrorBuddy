# Baseline Load Test Results

> Date: YYYY-MM-DD
> Environment: staging.mirrorbuddy.app
> k6 version: X.X.X
> Operator: [name]

## Test Matrix

| Stage | VUs  | Duration                    | Profile  |
| ----- | ---- | --------------------------- | -------- |
| 1     | 100  | 5 min (2 ramp + 3 sustain)  | baseline |
| 2     | 500  | 8 min (3 ramp + 5 sustain)  | baseline |
| 3     | 1000 | 10 min (5 ramp + 5 sustain) | baseline |

## Results: Health Endpoint

| Metric      | 100 VU | 500 VU | 1K VU | Threshold |
| ----------- | ------ | ------ | ----- | --------- |
| p50 latency | ms     | ms     | ms    | -         |
| p95 latency | ms     | ms     | ms    | < 200ms   |
| p99 latency | ms     | ms     | ms    | < 500ms   |
| req/s       |        |        |       | > 10      |
| Error rate  | %      | %      | %     | < 0.1%    |

## Results: Chat API

| Metric     | 100 VU | 500 VU | 1K VU | Threshold |
| ---------- | ------ | ------ | ----- | --------- |
| Create p95 | ms     | ms     | ms    | < 1000ms  |
| Stream p95 | ms     | ms     | ms    | < 5000ms  |
| Error rate | %      | %      | %     | < 5%      |
| Messages/s |        |        |       | -         |

## Results: Voice TTS

| Metric      | 100 VU | 500 VU | 1K VU | Threshold |
| ----------- | ------ | ------ | ----- | --------- |
| p95 latency | ms     | ms     | ms    | < 3000ms  |
| Error rate  | %      | %      | %     | < 5%      |

## Results: Tools API

| Metric      | 100 VU | 500 VU | 1K VU | Threshold |
| ----------- | ------ | ------ | ----- | --------- |
| p95 latency | ms     | ms     | ms    | < 5000ms  |
| Error rate  | %      | %      | %     | < 5%      |

## Infrastructure Observations

### Database Pool (during peak 1K VU)

- Active connections: /5
- Utilization: %
- Waiting requests:

### Vercel Functions (during peak 1K VU)

- Concurrent executions:
- Average duration: ms
- Cold starts observed:

## Bottlenecks Identified

1. [ ] Description + evidence
2. [ ] Description + evidence

## Recommendations

1. Action item
2. Action item

## Raw Data

k6 JSON output stored in `results/*.json` (not committed).
