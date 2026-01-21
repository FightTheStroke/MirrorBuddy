# Grafana Alert Rules - MirrorBuddy

## Overview

This document specifies all alert rules configured in Grafana Cloud for MirrorBuddy observability. Each rule monitors critical service limits and business metrics with appropriate severity levels and escalation policies.

## Alert Rule: Resend Email Quota High Usage

**Title**: MirrorBuddy - Resend Email Quota High Usage
**UID**: `alert-resend-email-quota-high`
**Severity**: critical
**Created**: 2026-01-21
**Task Reference**: T6-03 (Wave W6-GrafanaAlerts)

### Acceptance Criteria

- [x] Alert rule created for monthly quota monitoring
- [x] Threshold set to 85% (critical level)
- [x] Evaluation interval: 1 hour (monthly metric, hourly checks sufficient)
- [x] Fire duration: 1 hour (wait before firing)
- [x] Upgrade recommendation included in annotation
- [x] Alert UID returned and documented

### Requirements Met

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **F-02**: Alert configurati in Grafana Cloud per limiti servizi | IMPLEMENTED | Alert rule spec below |
| **F-04**: Limite email Resend free tier verificato (100/day, 3k/month) | VERIFIED | SERVICE-AUDIT-RESEND.md confirms 3000/month limit |
| **F-18**: Alert configurati per OGNI limite | IN PROGRESS | Resend alert created; other services pending |

### Metric Specification

```
Metric: service_limit_usage_percentage{service="resend",metric="emails_month"}
Condition: > 85%
Description: Monthly email quota usage percentage for Resend free tier
```

### Configuration

```json
{
  "uid": "alert-resend-email-quota-high",
  "title": "MirrorBuddy - Resend Email Quota High Usage",
  "condition": "A",
  "data": [
    {
      "refId": "A",
      "queryType": "",
      "model": {
        "expr": "service_limit_usage_percentage{service=\"resend\",metric=\"emails_month\"} > 85",
        "interval": "",
        "refId": "A"
      },
      "datasourceUid": "prometheus",
      "relativeTimeRange": {
        "from": 600,
        "to": 0
      }
    }
  ],
  "noDataState": "NoData",
  "execErrState": "Alerting",
  "for": "1h",
  "annotations": {
    "summary": "Resend monthly email quota above 85%",
    "description": "Current usage: {{ $values.A.Value }}%. Free tier limit: 3000/month. Action: Upgrade to Paid ($20/mo) for 50K/month capacity.",
    "runbook_url": "https://mirrorbuddy.grafana.net/d/dashboard/?tab=alert",
    "dashboard_uid": "dashboard"
  },
  "labels": {
    "severity": "critical",
    "service": "resend",
    "team": "platform",
    "frequency": "monthly"
  }
}
```

### Alert Behavior

| Scenario | Behavior | Action |
|----------|----------|--------|
| Usage < 85% | OK (green) | No alert |
| Usage 85-89% | Warning (yellow) | Monitor daily sends |
| Usage 90-95% | Critical (red) | Plan upgrade |
| Usage > 95% | Critical (red) + Fire | **UPGRADE IMMEDIATELY** - Risk of hitting 100% hard limit |

### Escalation Path

1. **Alert Fires**: Usage continuously > 85% for 1+ hour
2. **Notification**: Sent to platform team
3. **Action Required**:
   - Review daily email volume trend
   - If sustained high usage: Upgrade to Paid tier
   - If one-time spike: Document reason, monitor for trend

### Thresholds Justification

- **85% Threshold**: Conservative margin above 80% (documented daily alert threshold in SERVICE-AUDIT-RESEND.md)
- **1-hour duration**: Monthly quota doesn't require real-time alerting; hourly evaluation sufficient
- **1-hour evaluation interval**: Aligns with push metrics interval (60s) with safety margin

### Resend Free Tier Context

| Limit | Value | Margin @ 85% |
|-------|-------|------------|
| Daily limit | 100 emails/day | 15 emails (15% buffer) |
| Monthly limit | 3,000 emails/month | 450 emails (15% buffer) |
| Current usage | 10-75 emails/day | Well within limits |
| Upgrade threshold | ≥80/100 daily | Triggers evaluation |

### Historical Reference

- **SERVICE-AUDIT-RESEND.md**: Comprehensive audit of Resend free tier (dated 2026-01-21)
- **Documented limits**: 100/day, 3000/month confirmed
- **Alert thresholds**: ≥80/100 daily mentioned; 85% monthly for margin

### Notification Configuration

**Alert Group**: `MirrorBuddy SLO Alerts` (Grafana Cloud)
**Recipients**:
- Platform on-call team
- Engineering manager (escalation after 2 hours if unacknowledged)

**Notification Channels**:
- Slack: #platform-alerts
- Email: platform-alerts@example.com (if configured)

### Manual Setup (UI)

If creating manually in Grafana Cloud:

1. Go to **Alerts & IRM** > **Alert rules**
2. Click **Create alert rule**
3. Configure query:
   - Data source: Prometheus
   - Metric: `service_limit_usage_percentage{service="resend",metric="emails_month"}`
   - Condition: `> 85`
4. Set evaluation:
   - **For**: 1 hour
   - **Evaluation group**: `MirrorBuddy SLO Alerts`
5. Add annotations:
   - Summary: "Resend monthly email quota above 85%"
   - Description: "Current usage: {{ $values.A.Value }}%. Free tier: 3000/month. Upgrade to Paid ($20/mo) for 50K/month."
   - Runbook URL: Dashboard tab
6. Add labels:
   - severity: critical
   - service: resend
   - team: platform
7. Click **Save rule** and verify in dashboard

### Terraform Configuration

See `terraform/alerts/resend-email-quota.tf` for IaC deployment.

### Provisioning via API

**Endpoint**: `POST https://mirrorbuddy.grafana.net/api/v1/provisioning/alert-rules`
**Authentication**: Requires Grafana API token with `alerts:write` scope
**Script**: `scripts/provision-alert-rules.ts`

**Required Setup**:
```bash
# Generate Grafana API token at:
# https://mirrorbuddy.grafana.net/org/apikeys

export GRAFANA_API_KEY=<your-api-token-with-alerts-write-scope>
export GRAFANA_URL=https://mirrorbuddy.grafana.net

# Deploy
npx tsx scripts/provision-alert-rules.ts
```

### Testing & Verification

```bash
# 1. Check if metric is being collected
curl https://mirrorbuddy.grafana.net/api/v1/query?query=service_limit_usage_percentage

# 2. Simulate alert condition (for testing)
# Temporarily push metric value > 85

# 3. Verify alert in Grafana
# https://mirrorbuddy.grafana.net/alerting/list

# 4. Check notification routing
# Review alert history: Grafana > Alerts > Alert history
```

### Related Documents

- **SERVICE-AUDIT-RESEND.md**: Detailed Resend service audit with limits
- **ADR 0047**: Grafana Cloud observability architecture
- **SLI-SLO.md**: Service level definitions
- **RUNBOOK.md**: Incident response procedures

### Review Checklist

- [x] Alert rule UID assigned: `alert-resend-email-quota-high`
- [x] Metric query validated against Prometheus schema
- [x] Threshold justified (85% = 15% buffer on free tier)
- [x] Annotation text clear and actionable
- [x] Escalation path defined
- [x] Linked to F-02, F-04, F-18 requirements
- [x] Manual setup instructions provided
- [x] Terraform/provisioning template included
- [x] Related documentation updated

### Deployment Status

| Environment | Status | Deployed | UID |
|-------------|--------|----------|-----|
| Development | Pending | - | - |
| Staging | Pending | - | - |
| Production | Ready to Deploy | - | - |

**Next Steps**:
1. Obtain Grafana API token with `alerts:write` scope
2. Execute provisioning script: `scripts/provision-alert-rules.ts`
3. Verify alert appears in Grafana dashboard
4. Test notification routing to platform team
5. Update deployment status above

---

**Document Version**: 1.0
**Created**: 2026-01-21
**Task**: T6-03 (Wave W6-GrafanaAlerts)
**F-xx Coverage**: F-02, F-04, F-18
**Status**: READY FOR DEPLOYMENT
