# Data Breach Response Protocol

> GDPR Article 33/34 compliance - Personal data breach notification

## 1. Detection & Identification

### Breach Indicators

- Unauthorized access to database
- Unusual data export activity
- Authentication anomalies (failed logins, unknown IPs)
- User reports of account compromise
- Third-party security notifications

### Detection Tools

```bash
# Check recent rate limit violations
curl https://mirrorbuddy.grafana.net/api/dashboards/uid/rate-limits

# Check auth logs for anomalies
npm run logs:auth -- --since=24h

# Check for mass data exports
SELECT COUNT(*) FROM audit_log
WHERE action = 'DATA_EXPORT'
AND created_at > NOW() - INTERVAL '24 hours';
```

## 2. Immediate Response (0-4 hours)

### Step 1: Contain the Breach

```bash
# Revoke all OAuth tokens
npx prisma db execute --stdin <<< "UPDATE \"GoogleAccount\" SET \"isConnected\" = false, \"accessToken\" = '';"

# Force session invalidation (if compromised)
# Update cookie secret in Vercel environment variables

# Block suspicious IPs (via Vercel WAF)
```

### Step 2: Assess Scope

- [ ] Identify affected users
- [ ] Determine data types exposed
- [ ] Document access timeline
- [ ] Preserve evidence (logs, timestamps)

### Step 3: Assemble Response Team

| Role          | Responsibility                 | Contact      |
| ------------- | ------------------------------ | ------------ |
| **DPO**       | GDPR compliance, notifications | [Set in env] |
| **Tech Lead** | Technical investigation        | [Set in env] |
| **Legal**     | Regulatory obligations         | [Set in env] |

## 3. Notification Requirements (GDPR)

### Authority Notification (72 hours)

**Required if**: Breach likely results in risk to individuals

**Garante Privacy (Italy)**: https://www.garanteprivacy.it/

**Notification includes**:

1. Nature of breach (what data, how many affected)
2. Contact details of DPO
3. Likely consequences
4. Measures taken/proposed

### User Notification

**Required if**: High risk to rights and freedoms

**Template** (store in `src/lib/email/templates/breach-notification.ts`):

```
Subject: Important Security Notice - MirrorBuddy

Dear [Name],

We are writing to inform you of a security incident that may have
affected your account data.

**What happened**: [Description]
**When**: [Date/time]
**Data potentially affected**: [List]
**What we're doing**: [Actions]
**What you can do**: [Recommendations]

For questions: privacy@mirrorbuddy.com
```

## 4. Investigation Checklist

### Technical Analysis

- [ ] Review access logs (`/var/log/nginx/access.log`)
- [ ] Check database query logs
- [ ] Analyze rate limit violations
- [ ] Review OAuth token activity
- [ ] Check for SQL injection attempts
- [ ] Review file upload logs

### Data Impact Assessment

| Data Type       | Encrypted     | Affected Users | Risk Level |
| --------------- | ------------- | -------------- | ---------- |
| Email addresses | No            | TBD            | Medium     |
| OAuth tokens    | Yes (AES-256) | TBD            | Low        |
| Conversations   | No            | TBD            | High       |
| Profile data    | No            | TBD            | Medium     |

## 5. Remediation

### Immediate Actions

```bash
# Rotate encryption keys
TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Re-encrypt existing tokens
npm run security:rotate-tokens

# Update CSRF secret
CSRF_SECRET=$(openssl rand -base64 32)

# Update cookie signing key
COOKIE_SECRET=$(openssl rand -base64 32)
```

### Long-term Actions

- [ ] Patch vulnerability
- [ ] Update security policies
- [ ] Conduct security audit
- [ ] Implement additional monitoring
- [ ] Update incident response plan

## 6. Documentation

### Breach Log Template

```json
{
  "incident_id": "BREACH-YYYY-MM-DD-001",
  "detected_at": "ISO8601 timestamp",
  "contained_at": "ISO8601 timestamp",
  "resolved_at": "ISO8601 timestamp",
  "affected_users": 0,
  "data_types": [],
  "root_cause": "",
  "remediation": [],
  "authority_notified": false,
  "users_notified": false,
  "lessons_learned": ""
}
```

### Required Records (GDPR Article 33(5))

- Facts relating to breach
- Effects of breach
- Remedial action taken

**Retention**: Keep breach records for 5 years minimum.

## 7. Post-Incident

### Review Meeting Agenda

1. Timeline reconstruction
2. Root cause analysis
3. Effectiveness of response
4. Policy/procedure updates
5. Training needs

### Metrics to Track

- Time to detection
- Time to containment
- Time to notification
- Number of affected users
- Recurrence rate

## Emergency Contacts

| Service         | Contact                     |
| --------------- | --------------------------- |
| Vercel Support  | https://vercel.com/support  |
| Upstash Support | https://upstash.com/support |
| Garante Privacy | protocollo@gpdp.it          |
| CERT-Italia     | cert@cert-pa.it             |

---

**Last Updated**: 2026-01-19
**Next Review**: 2026-07-19
**Owner**: Security Team
