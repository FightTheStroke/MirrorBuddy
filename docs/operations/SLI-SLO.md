# MirrorBuddy SLI/SLO Definitions

> ISE Engineering Fundamentals: [Service Level Objectives](https://microsoft.github.io/code-with-engineering-playbook/observability/slo/)

## Overview

This document defines Service Level Indicators (SLIs) and Service Level Objectives (SLOs) for MirrorBuddy's critical services.

## Critical Services

### 1. Voice API (Azure OpenAI Realtime)

**Service**: Real-time voice interaction with AI Maestros

| SLI | Description | Measurement |
|-----|-------------|-------------|
| Availability | % of successful voice session starts | `success_count / total_attempts * 100` |
| Latency (P50) | Time to first voice response | Median response time |
| Latency (P99) | Time to first voice response (99th percentile) | 99th percentile response time |
| Error Rate | % of voice sessions with errors | `error_count / total_sessions * 100` |

**SLOs**:

| Metric | Target | Error Budget (monthly) |
|--------|--------|------------------------|
| Availability | 99.5% | 3.6 hours downtime |
| Latency P50 | < 500ms | - |
| Latency P99 | < 2000ms | - |
| Error Rate | < 1% | - |

### 2. Chat API (Text conversations)

**Service**: Text-based AI tutoring conversations

| SLI | Description | Measurement |
|-----|-------------|-------------|
| Availability | % of successful chat completions | `success_count / total_requests * 100` |
| Latency (TTFB) | Time to first byte of streaming response | P50 and P99 |
| Throughput | Requests per second handled | RPS under normal load |

**SLOs**:

| Metric | Target | Error Budget (monthly) |
|--------|--------|------------------------|
| Availability | 99.9% | 43 minutes downtime |
| Latency P50 | < 300ms TTFB | - |
| Latency P99 | < 1500ms TTFB | - |
| Throughput | 100 RPS | - |

### 3. Database (PostgreSQL + pgvector)

**Service**: Primary data store and vector search

| SLI | Description | Measurement |
|-----|-------------|-------------|
| Availability | % of successful queries | Query success rate |
| Query Latency | Time to execute queries | P50 and P99 |
| Vector Search | Semantic search response time | P50 and P99 |

**SLOs**:

| Metric | Target |
|--------|--------|
| Availability | 99.95% |
| Query Latency P50 | < 50ms |
| Query Latency P99 | < 200ms |
| Vector Search P50 | < 100ms |
| Vector Search P99 | < 500ms |

### 4. Health Endpoint

**Service**: `/api/health` for monitoring

| SLI | Description |
|-----|-------------|
| Availability | Always returns within timeout |
| Response Time | < 100ms for healthy status |

**SLOs**:

| Metric | Target |
|--------|--------|
| Availability | 99.99% |
| Response Time | < 100ms |

## Error Budget Policy

### Calculation

```
Monthly Error Budget = (1 - SLO) * 30 days * 24 hours * 60 minutes

Example for 99.5% availability:
(1 - 0.995) * 30 * 24 * 60 = 216 minutes = 3.6 hours
```

### Actions by Error Budget Status

| Budget Consumed | Status | Actions |
|-----------------|--------|---------|
| 0-50% | Green | Normal development velocity |
| 50-75% | Yellow | Increase monitoring, reduce risky deployments |
| 75-100% | Orange | Focus on reliability, no new features |
| >100% | Red | All hands on reliability, incident review required |

## Monitoring Implementation

### Health Check Endpoint

The `/api/health` endpoint provides:
- Database connectivity status
- AI provider availability
- Memory usage metrics
- Overall health status (healthy/degraded/unhealthy)

### Metrics to Track

```typescript
// Example metrics structure
interface Metrics {
  // Voice API
  voice_session_start_total: Counter;
  voice_session_errors_total: Counter;
  voice_response_latency_ms: Histogram;

  // Chat API
  chat_request_total: Counter;
  chat_error_total: Counter;
  chat_ttfb_ms: Histogram;

  // Database
  db_query_total: Counter;
  db_query_errors_total: Counter;
  db_query_latency_ms: Histogram;
}
```

### Alerting Thresholds

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| VoiceAPIDown | Error rate > 5% for 5min | Critical | Page on-call |
| HighLatency | P99 > 3s for 10min | Warning | Investigate |
| ErrorBudgetBurn | >10% budget consumed in 1hr | Warning | Review changes |
| DatabaseSlow | Query P99 > 500ms | Warning | Check queries |

## Dashboards

Recommended dashboard panels:

1. **Overview**: Health status, uptime %, error budget remaining
2. **Voice API**: Session count, latency distribution, error rate
3. **Chat API**: Request rate, TTFB, streaming completion rate
4. **Database**: Query rate, latency, connection pool usage
5. **Infrastructure**: Memory, CPU, disk I/O

## Review Cadence

- **Daily**: Check error budget consumption
- **Weekly**: Review SLO compliance, incident trends
- **Monthly**: Full SLO review, adjust targets if needed
- **Quarterly**: Strategic review, capacity planning

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial SLI/SLO definitions |
