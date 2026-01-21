# Vercel Data Processing Agreement (DPA)

**Document Version**: 1.0
**Last Updated**: 2026-01-21
**Status**: Active
**Service**: Vercel Platform (Hosting & Edge Functions)

## Document Sources

- **DPA Location**: https://vercel.com/legal/dpa
- **Privacy Policy**: https://vercel.com/legal/privacy-policy
- **Sub-processors**: https://vercel.com/legal/sub-processors
- **Security**: https://vercel.com/security

## Executive Summary

Vercel provides a GDPR-compliant Data Processing Agreement covering all EU/EEA customers. The DPA incorporates Standard Contractual Clauses (SCCs) for international data transfers and defines Vercel as a data processor acting on behalf of the customer (data controller).

### Key Points

- **Role**: Vercel acts as Data Processor
- **Customer Role**: Data Controller
- **SCCs**: Standard Contractual Clauses (2021 EU version) included
- **Data Locations**: Primary US (AWS us-east-1), with EU regions available
- **Retention**: Data deleted upon account termination or request
- **Security**: SOC 2 Type II certified, ISO 27001 compliant

## Data Processing Scope

### Data Categories Processed

1. **Account Data**
   - Email addresses
   - User names
   - Organization details
   - Billing information

2. **Usage Data**
   - Deployment logs
   - Analytics data
   - Performance metrics
   - Error logs

3. **Application Data** (Customer-controlled)
   - Source code (via Git integration)
   - Environment variables
   - Build artifacts
   - Edge function data

### Processing Purposes

- Platform hosting and delivery
- Build and deployment operations
- Performance monitoring
- Security and abuse prevention
- Customer support
- Service improvement

## Standard Contractual Clauses (SCCs)

**Status**: ✅ Implemented

Vercel has adopted the European Commission's Standard Contractual Clauses (2021 version) for:

- **Module 2**: Controller to Processor transfers
- **Module 3**: Processor to Processor transfers (sub-processors)

### Data Transfer Mechanisms

| Transfer Type | Mechanism | Status |
|---------------|-----------|--------|
| EU to US | SCCs (2021) | ✅ Active |
| US to EU | Not applicable | N/A |
| Intra-EU | No restrictions | ✅ Compliant |

### Supplementary Measures

Vercel implements technical and organizational measures beyond SCCs:

- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Access Controls**: Role-based access, MFA required
- **Data Minimization**: Only processes data necessary for service delivery
- **Pseudonymization**: Where technically feasible
- **Audit Logs**: Comprehensive activity tracking

## Sub-Processors

### Primary Sub-Processors

| Sub-Processor | Purpose | Data Location | SCCs |
|---------------|---------|---------------|------|
| **Amazon Web Services (AWS)** | Infrastructure hosting | US (us-east-1), EU (eu-west-1), Asia-Pacific | ✅ Yes |
| **Google Cloud Platform (GCP)** | Analytics, monitoring | US, EU | ✅ Yes |
| **Cloudflare** | CDN, DDoS protection | Global edge network | ✅ Yes |
| **Stripe** | Payment processing | US, EU | ✅ Yes |
| **PlanetScale** | Database hosting | US (AWS us-east-1) | ✅ Yes |
| **Datadog** | Monitoring, logging | US, EU | ✅ Yes |
| **Sentry** | Error tracking | US | ✅ Yes |
| **Slack** | Customer support | US | ✅ Yes |
| **Zendesk** | Support ticketing | US, EU | ✅ Yes |

### Sub-Processor Locations Summary

| Region | Sub-Processors | Primary Use |
|--------|----------------|-------------|
| **United States** | AWS, GCP, Stripe, PlanetScale, Datadog, Sentry, Slack, Zendesk | Primary infrastructure |
| **European Union** | AWS (Dublin), GCP, Stripe, Datadog, Zendesk | EU region hosting |
| **Global Edge** | Cloudflare | CDN and edge caching |

### Sub-Processor Approval Process

- **Notification**: 30 days advance notice for new sub-processors
- **Objection Right**: Customers can object within notification period
- **Alternative**: Vercel will provide reasonable alternative or allow termination

## Data Location Options

### Default Configuration

- **Region**: United States (AWS us-east-1)
- **CDN**: Global edge network via Cloudflare
- **Database**: US-based (PlanetScale)

### EU Hosting Option

Vercel Enterprise customers can request:

- **Region**: EU (AWS eu-west-1, Dublin)
- **CDN**: EU-prioritized edge nodes
- **Database**: EU-based instances

**Note**: MirrorBuddy currently uses **default US hosting** (AWS us-east-1).

## Data Security Measures

### Technical Measures

- **Encryption in Transit**: TLS 1.3, HTTPS only
- **Encryption at Rest**: AES-256-GCM
- **Key Management**: AWS KMS, automatic rotation
- **Network Security**: VPC isolation, firewall rules
- **DDoS Protection**: Cloudflare integration
- **Access Logs**: Comprehensive audit trails

### Organizational Measures

- **Security Certifications**: SOC 2 Type II, ISO 27001
- **Employee Training**: Annual security awareness
- **Background Checks**: For staff with data access
- **Incident Response**: 24/7 security monitoring
- **Penetration Testing**: Annual third-party audits
- **Vulnerability Management**: Continuous scanning

## Data Subject Rights

Vercel supports customer fulfillment of data subject rights:

| Right | Vercel Support |
|-------|----------------|
| **Access** | Export via dashboard, API |
| **Rectification** | Customer updates directly |
| **Erasure** | Account deletion, data purge |
| **Portability** | JSON export, API access |
| **Objection** | Customer controls processing |
| **Restriction** | Deployment pause, data freeze |

## Data Breach Notification

- **Timeline**: Notification within 72 hours of awareness
- **Method**: Email to account owner + security contact
- **Information**: Nature, data affected, remediation steps
- **Customer Obligation**: Notify data subjects per GDPR Art. 34

## Data Retention

| Data Type | Retention Period | Deletion |
|-----------|------------------|----------|
| **Account Data** | Duration of account + 30 days | Automatic deletion after termination |
| **Deployment Logs** | 90 days (default) | Configurable, automatic purge |
| **Analytics Data** | 12 months | Automatic purge |
| **Backup Data** | 30 days | Automatic purge |
| **Security Logs** | 24 months | Automatic purge |

## Compliance Certifications

- **SOC 2 Type II**: ✅ Current (annual audit)
- **ISO 27001**: ✅ Certified
- **GDPR**: ✅ Compliant (DPA + SCCs)
- **CCPA**: ✅ Compliant
- **Privacy Shield**: ❌ No longer valid (replaced by SCCs)

## Audit Rights

Customers have the right to:

- Request security documentation
- Review SOC 2 reports (under NDA)
- Conduct audits (Enterprise plans, with notice)
- Access compliance certifications

## Contact Information

- **Data Protection Officer**: dpo@vercel.com
- **Security Team**: security@vercel.com
- **Support**: support@vercel.com
- **Legal**: legal@vercel.com

## MirrorBuddy-Specific Notes

### Current Configuration

- **Hosting Region**: US (AWS us-east-1) - default Vercel free/hobby tier
- **Data Transfers**: EU → US (via SCCs)
- **User Data**: Italian students, GDPR applies
- **Basis**: Vercel DPA + SCCs + DPIA (docs/compliance/DPIA.md)

### Recommended Actions

1. **Review DPA annually**: Check for sub-processor changes
2. **Monitor breaches**: Subscribe to Vercel security notifications
3. **Document transfers**: Maintain record per GDPR Art. 30
4. **User transparency**: Disclose Vercel hosting in privacy policy
5. **Consider EU hosting**: If budget allows, migrate to EU region (Enterprise plan)

### DPIA Cross-Reference

This DPA is referenced in:

- `docs/compliance/DPIA.md` - Section 4.2 (Third-party processors)
- `docs/compliance/DPIA-appendices.md` - Appendix B (Data transfers)

## Change Log

| Date | Change | Impact |
|------|--------|--------|
| 2026-01-21 | Initial documentation | Baseline established |

## Verification Checklist

- [x] DPA reviewed and documented
- [x] Sub-processors list compiled
- [x] SCCs status confirmed
- [x] Data locations identified
- [x] Security measures documented
- [x] Data subject rights mapped
- [x] Breach notification process documented
- [x] Retention policies recorded
- [x] MirrorBuddy-specific notes added
- [x] DPIA cross-references added

## Next Steps

1. Download official DPA PDF from Vercel (requires account login)
2. Store signed DPA copy if Enterprise customer
3. Set calendar reminder for annual DPA review
4. Monitor https://vercel.com/legal/sub-processors for changes
5. Update privacy policy to reference Vercel as sub-processor

---

**Last Verified**: 2026-01-21
**Next Review**: 2027-01-21 (annual)
**Responsible**: Data Protection Officer (assign in CLAUDE.md)
