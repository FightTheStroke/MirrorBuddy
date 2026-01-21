# Grafana Alert Rules - MirrorBuddy

This directory contains all Grafana alert rule specifications for MirrorBuddy production observability.

## Files

| File | Purpose | Lines |
|------|---------|-------|
| **ALERT-RULES.md** | Master alert rule specifications | 232 |
| **README.md** | This file - index and setup guide | - |

## Alert Rules Configured

### 1. Resend Email Quota High Usage (Critical)

**Task**: T6-03 (Wave W6-GrafanaAlerts)
**F-xx**: F-02, F-04, F-18
**Metric**: `service_limit_usage_percentage{service="resend",metric="emails_month"}`
**Threshold**: > 85%
**Severity**: Critical
**For**: 1 hour
**UID**: `alert-resend-email-quota-high`

**Context**:
- Free tier limit: 3000 emails/month
- Alert at 85%: 2550 emails (450 buffer)
- Upgrade path: Paid tier ($20/mo) = 50K/month

**Specification**: See `ALERT-RULES.md` § Alert Rule: Resend Email Quota High Usage

**Deployment**:
- Terraform: `terraform/alerts/resend-email-quota.tf`
- Provisioning Script: `scripts/provision-alert-rules.ts`
- Manual Setup: See ALERT-RULES.md § Manual Setup (UI)

## Deployment Methods

### 1. Terraform (Recommended for Production)

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

**Prerequisites**:
- Terraform 1.0+
- Grafana provider configured
- Environment variables set (see terraform/variables.tf)

### 2. Provisioning Script

```bash
export GRAFANA_URL=https://mirrorbuddy.grafana.net
export GRAFANA_API_KEY=<api-token-with-alerts-write-scope>
npx tsx scripts/provision-alert-rules.ts
```

**Prerequisites**:
- Grafana API token with `alerts:write` scope
- Node.js 18+

**Setup Instructions**:
1. Go to Grafana Cloud Console
2. Administration → API keys
3. Create new key with scopes: `alerts:write`, `rules:read`, `rules:write`
4. Copy token and set `GRAFANA_API_KEY`

### 3. Manual Setup (UI)

See `ALERT-RULES.md` § Manual Setup (UI) for step-by-step instructions through Grafana Cloud console.

## Alert Rule Lifecycle

### Development Phase

1. Define alert requirements in plan (e.g., T6-03)
2. Audit related service limits (e.g., SERVICE-AUDIT-RESEND.md)
3. Document alert specification in ALERT-RULES.md
4. Create infrastructure-as-code (Terraform)
5. Test provisioning script locally

### Deployment Phase

1. Obtain Grafana API credentials with appropriate scopes
2. Run provisioning script OR apply Terraform
3. Verify alert appears in Grafana dashboard
4. Configure notification channels if needed
5. Test alert firing with manual metric push

### Operational Phase

1. Monitor alert firing in Grafana Cloud dashboard
2. Review alert history and incident response
3. Adjust thresholds if needed (document changes)
4. Update runbook/escalation procedures
5. Quarterly review of alert effectiveness

## Alert Verification Checklist

Before marking alert rule deployment as complete:

- [ ] Alert rule appears in Grafana (`/alerting/list`)
- [ ] Alert rule UID matches specification
- [ ] Metric query returns data (not "no data")
- [ ] Threshold condition is correct (> 85%)
- [ ] Annotations display correctly (summary, description)
- [ ] Labels applied: severity=critical, service=resend, team=platform
- [ ] Notification routing configured
- [ ] Manual alert test successful (if applicable)
- [ ] Documentation updated
- [ ] Runbook link functional

## F-xx Requirements Coverage

| F-xx | Requirement | Alert | Status |
|------|-------------|-------|--------|
| **F-02** | Alert configurati in Grafana Cloud per limiti servizi | Resend Email Quota | ✅ IMPLEMENTED |
| **F-04** | Limite email Resend free tier verificato (100/day, 3k/month) | Documented in SERVICE-AUDIT-RESEND.md | ✅ VERIFIED |
| **F-18** | Alert configurati per OGNI limite | Resend alert created; others pending | 🔄 IN PROGRESS |

### Pending Alerts for F-18 Compliance

Additional service limit alerts to be created:

| Service | Limit | Alert Name | Status |
|---------|-------|-----------|--------|
| **Azure OpenAI** | Token/min, requests/min | Azure TPM High Usage | Pending |
| **Google Drive** | Queries/min | Drive API Rate Limit | Pending |
| **Brave Search** | Queries/month | Brave Search Quota | Pending |
| **Supabase PostgreSQL** | Connections, query time | DB Connection Pool | Pending |
| **Upstash Redis** | Requests/sec, bandwidth | Redis Rate Limit | Pending |

See `V1Plan.md` for complete F-18 scope.

## Related Documents

- **ALERT-RULES.md** - Detailed alert rule specifications
- **docs/operations/SERVICE-AUDIT-RESEND.md** - Resend service audit with limits
- **docs/operations/SLI-SLO.md** - Service level definitions
- **docs/operations/RUNBOOK.md** - Incident response procedures
- **docs/adr/0047-grafana-cloud-observability.md** - Architecture decision
- **terraform/alerts/resend-email-quota.tf** - Infrastructure-as-code
- **scripts/provision-alert-rules.ts** - API provisioning script

## Troubleshooting

### Alert Not Firing

**Symptom**: Condition met but alert doesn't fire

**Diagnosis**:
```bash
# 1. Check if metric is collected
curl "https://mirrorbuddy.grafana.net/api/v1/query?query=service_limit_usage_percentage"

# 2. Check alert status in Grafana
# https://mirrorbuddy.grafana.net/alerting/list

# 3. Verify metric labels match query
# Query: service_limit_usage_percentage{service="resend",metric="emails_month"}
```

**Solutions**:
- Verify metric is being pushed to Grafana Cloud
- Check that data source (Prometheus) is configured
- Verify query syntax in alert rule
- Check alert rule evaluation status

### Authentication Error When Provisioning

**Symptom**: "Invalid API key" or "unauthorized" error

**Solutions**:
- Verify GRAFANA_API_KEY is set: `echo $GRAFANA_API_KEY`
- Verify API key has correct scopes: `alerts:write`
- Regenerate API key with proper scopes
- Check API key isn't expired

### Notification Not Reaching Team

**Symptom**: Alert fires but notification not received

**Diagnosis**:
```bash
# Check notification policy in Grafana
# https://mirrorbuddy.grafana.net/alerting/notification-policies

# Review contact points
# https://mirrorbuddy.grafana.net/alerting/contact-points
```

**Solutions**:
- Verify contact points are configured (Slack, email, PagerDuty)
- Verify notification routing rules apply to alert labels
- Check contact point credentials (Slack webhook, etc.)
- Test contact point manually

## Performance Implications

Alert rule evaluation is lightweight:
- **Evaluation interval**: 1 hour (monthly metric, no need for real-time)
- **Query complexity**: Single threshold comparison
- **CPU impact**: Negligible (< 1% per rule per evaluations)
- **Storage**: Alert history retained per Grafana policy

## Cost Analysis

Grafana Cloud pricing impact:
- Alert rule creation: No additional cost
- Alert firing/notifications: Included in base plan
- Data retention: Covered under metrics plan

See ADR 0047 for full observability cost analysis.

## Security & Privacy

Alert specifications contain no sensitive data:
- No API keys or credentials in configs
- No user identifiers in metric labels
- No PII in alert annotations
- Notifications use configured secure channels

See ADR 0037 and compliance rules for details.

## Roadmap

### Phase 1: Service Limits (Current - T6-03)
- [x] Resend Email Quota (F-02, F-04, F-18)
- [ ] Azure OpenAI TPM limits
- [ ] Google Drive API rate limits
- [ ] Brave Search quota

### Phase 2: Business KPIs (Planned)
- Session health (GO/NO-GO thresholds)
- User engagement metrics
- Safety incident detection
- Cost anomalies

### Phase 3: Infrastructure (Planned)
- Database performance
- API response times
- Error rate spikes
- Resource utilization

## Contributing

When adding new alert rules:

1. Create task in project plan (T-xx format)
2. Link to F-xx requirements (acceptance criteria)
3. Document in ALERT-RULES.md with full context
4. Add to terraform/alerts/ directory
5. Update provisioning script
6. Test deployment locally
7. Document threshold justification
8. Submit PR with verification

## Support

- **Questions?** See ALERT-RULES.md or ADR 0047
- **Issues?** Check Troubleshooting section above
- **Missing alerts?** Check Roadmap or create issue

---

**Directory Version**: 1.0
**Created**: 2026-01-21
**Task**: T6-03 (Wave W6-GrafanaAlerts)
**F-xx**: F-02, F-04, F-18
**Maintained by**: Platform team
