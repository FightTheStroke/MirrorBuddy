# Operations Rules - MirrorBuddy

## Health Endpoints

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `GET /api/health` | Basic health | Load balancers, k8s probes |
| `GET /api/health/detailed` | Full metrics | Dashboards, debugging |
| `GET /api/metrics` | Prometheus format | Grafana scraping |

## Grafana Cloud

**Dashboard**: https://mirrorbuddy.grafana.net/d/mirrorbuddy-sli-slo/

**Environment variables** (in `.env`):
```bash
GRAFANA_CLOUD_PROMETHEUS_URL=https://...
GRAFANA_CLOUD_PROMETHEUS_USER=...
GRAFANA_CLOUD_API_KEY=...
```

**Test push**: `npx tsx scripts/test-grafana-push.ts`

**Implementation**: `src/lib/observability/prometheus-push-service.ts`

## Runbooks

| Document | Purpose |
|----------|---------|
| `docs/operations/SLI-SLO.md` | Service level definitions |
| `docs/operations/RUNBOOK.md` | Incident response |
| `docs/operations/RUNBOOK-PROCEDURES.md` | Maintenance procedures |

## Observability Stack

```
src/lib/observability/
├── prometheus-push-service.ts  # Metrics push to Grafana Cloud
└── ...

src/lib/logger/
└── ...                         # Structured JSON logging
```

## Quick Debugging

```bash
# Check health
curl http://localhost:3000/api/health

# Check detailed metrics
curl http://localhost:3000/api/health/detailed

# View Prometheus metrics
curl http://localhost:3000/api/metrics
```

## ADR References

- ADR 0037: Deferred production items (auth, Redis, IaC)
- ADR 0047: Grafana Cloud observability
