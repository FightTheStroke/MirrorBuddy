# ADR 0037: Deferred Production Items

## Status

Accepted

## Date

2025-01-11

## Context

During production hardening review, several items were identified as important for
enterprise-grade production deployment but are intentionally deferred for this
release. This ADR documents the rationale and planned timeline for each.

## Deferred Items

### 1. Authentication System

**Current State**: Cookie-based user ID, no authentication.

**Why Deferred**:
- MirrorBuddy is currently in closed beta with known users
- Parent supervision is the primary access control mechanism
- Adding auth requires significant UX changes (login flows, password recovery)
- Parent consent flow must be designed carefully for GDPR compliance

**Planned Solution**: Azure AD B2C or Auth0 with:
- Parent account creation and verification
- Child account under parent supervision
- Magic link for passwordless access (accessibility)

**Timeline**: Before public beta launch

**Risk Mitigation**:
- Application not exposed to public internet during beta
- Safety guardrails protect content regardless of auth

### 2. Redis for Rate Limiting

**Current State**: In-memory rate limiting, lost on restart.

**Why Deferred**:
- Single-instance deployment for beta (no scaling needed)
- Rate limits primarily protect against abuse, not load
- In-memory is sufficient for current user base

**Planned Solution**: Redis or Azure Cache with:
- Distributed rate limiting
- Session storage
- Cache for AI responses

**Timeline**: Before multi-instance deployment

**Risk Mitigation**:
- Conservative rate limits set
- Safety systems have independent limits
- Restart clears rate limit state (acceptable for beta)

### 3. Infrastructure as Code (Terraform/Bicep)

**Current State**: Docker Compose for local/staging.

**Why Deferred**:
- Beta runs on single managed instance
- IaC complexity not justified until Azure deployment
- Focus on application hardening first

**Planned Solution**: Bicep templates for:
- Azure Container Apps or AKS
- Azure Database for PostgreSQL
- Azure OpenAI resource provisioning
- Azure Key Vault for secrets

**Timeline**: Production deployment milestone

### 4. Distributed Tracing (OpenTelemetry)

**Current State**: Structured JSON logging.

**Why Deferred**:
- Logging sufficient for single-instance debugging
- OTel requires collector infrastructure
- Current observability adequate for beta scale

**Planned Solution**: OpenTelemetry with:
- Azure Monitor / Application Insights
- Distributed trace correlation
- Custom metrics for AI latency

**Timeline**: When multi-service architecture needed

### 5. Advanced Monitoring Dashboards

**Current State**: Health endpoint with JSON metrics.

**Why Deferred**:
- JSON health check queryable by any monitoring tool
- No dedicated monitoring infrastructure yet
- Grafana/Azure dashboards require setup time

**Planned Solution**:
- Azure Monitor workbooks or Grafana dashboards
- Alert rules for SLO violations
- Error budget tracking

**Timeline**: With production deployment

## Decision

Defer these items to maintain focus on:
1. Core educational functionality
2. Safety systems for minor users
3. Accessibility compliance
4. Application stability

## Consequences

### Positive

- Faster iteration on core features
- Reduced operational complexity during beta
- Clear roadmap for production hardening
- Resources focused on user-facing value

### Negative

- Not suitable for public internet exposure
- Manual scaling if user base grows
- Limited observability for complex issues
- Technical debt to address later

### Neutral

- Beta users accept these limitations
- Parent supervision compensates for missing auth
- Documented plan provides clarity

## References

- [ADR 0015: Database-First Architecture](./0015-database-first-architecture.md)
- [ADR 0004: Safety Guardrails](./0004-safety-guardrails.md)
- [ISE Observability Guide](https://microsoft.github.io/code-with-engineering-playbook/observability/)
- [Azure Well-Architected Framework](https://learn.microsoft.com/azure/well-architected/)
