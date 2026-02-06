# ADR 0127: Security & Encryption Hardening

## Status

Accepted

## Date

2026-02-06

## Context

MirrorBuddy operates under strict regulatory requirements for protecting children's personal data in an educational context. The combination of GDPR (data protection), COPPA (children under 13), EU AI Act 2024/1689 (high-risk AI systems), and Italian Law 132/2025 (AI transparency in education) mandates comprehensive security measures beyond baseline compliance.

### Regulatory Drivers

1. **GDPR Article 32**: Requires encryption of personal data as a security measure for high-risk processing
2. **GDPR Article 25**: Data protection by design and by default
3. **GDPR Article 30**: Records of processing activities (audit trail requirement)
4. **EU AI Act**: Special requirements for AI systems used with children (transparency, security, bias mitigation)
5. **COPPA § 312.2**: Enhanced protection for personal information from children under 13

### Current Security Gaps

Prior to Plan 124, MirrorBuddy had foundational security (TLS in transit, parameterized queries, session auth) but lacked:

- Multi-locale PII detection for 5 languages (Italian, French, German, Spanish, English)
- Encryption at rest for PII fields in database
- Privacy-aware RAG pipeline (risk of PII leakage into vector embeddings)
- Transport security hardening (HSTS, certificate validation, cookie encryption)
- Encryption key rotation strategy
- Enterprise secret management (hard-coded environment variables)
- Audit trail for PII decryption access

These gaps created compliance risk and exposed MirrorBuddy to potential data breaches, especially given the multi-country deployment and cross-border data processing.

## Decision

Implement a six-wave security hardening initiative addressing PII detection, encryption at rest and in transit, key management, and enterprise secret management.

### Wave 1: Multi-Locale PII Detection

**Decision**: Build locale-specific PII pattern matching for phone numbers, fiscal IDs, addresses, and names across all 5 supported locales.

**Implementation**:

- Per-locale pattern organization in `src/lib/privacy/pii-patterns.ts`
- Unicode property escapes (`\p{Lu}\p{Ll}+`) for international name matching with diacritic support
- Four standardized categories: `phone`, `fiscalId`, `address`, `name`
- Locale-specific patterns:
  - Italian Codice Fiscale (16 alphanumeric)
  - French INSEE (15 digits)
  - German Steuer-ID (11 digits)
  - Spanish NIF/NIE/CIF (8-9 characters)
  - Multiple phone formats (+39, +33, +49, +34, +44, +1)

**Rationale**: Regulatory compliance requires PII detection across all supported languages. Centralized pattern management enables consistent anonymization across the application and simplifies GDPR Article 17 (right to erasure) implementation.

### Wave 2: Privacy-Aware RAG Pipeline

**Decision**: Implement dual-layer anonymization (defense in depth) for RAG embedding generation and storage.

**Implementation**:

- Wrapper function `generatePrivacyAwareEmbedding()` in `src/lib/privacy/privacy-aware-embedding.ts`
- Anonymization at embedding layer (before OpenAI API call)
- Anonymization at storage layer (before vector database write)
- Integration points: `retrieval-service.ts`, `summary-indexer.ts`, `tool-rag-indexer.ts`, `tool-embedding.ts`
- Message flow: Original message to AI for quality → Anonymized message to database for privacy

**Rationale**: Vector embeddings can inadvertently encode PII patterns. Dual-layer anonymization provides fail-safe protection: if one layer fails (bug, misconfiguration), the second layer prevents PII leakage. Trade-off of 10-20ms added latency is acceptable for regulatory compliance and risk mitigation.

### Wave 3: PII Encryption at Rest

**Decision**: Encrypt all PII fields in the database using AES-256-GCM with Prisma middleware for transparent encrypt/decrypt.

**Implementation**:

- AES-256-GCM encryption service in `src/lib/security/pii-encryption.ts`
- Format: `iv:encrypted:authTag` (authenticated encryption with integrity verification)
- Prisma middleware in `src/lib/db.ts` for automatic encrypt on write, decrypt on read
- SHA-256 `emailHash` field for querying encrypted emails (unique constraint)
- Dedicated `PII_ENCRYPTION_KEY` environment variable (fallback to `NEXTAUTH_SECRET` for dev)
- Migration script `scripts/migrate-encrypt-pii.ts` with dry-run default, batch processing (100 users/batch)

**Rationale**: GDPR Article 32 mandates encryption of personal data at rest. Prisma middleware ensures consistency (no risk of forgetting to encrypt before save or decrypt after read) and keeps application code database-agnostic. Deterministic hash for email lookups is an acceptable trade-off (reveals equality but not content) for maintaining authentication flow functionality.

### Wave 4: Transport Security Hardening

**Decision**: Implement HSTS with preload, SSL strict mode for production databases, and AES-256-GCM cookie encryption.

**Implementation**:

- HSTS header in `src/proxy.ts`: `max-age=31536000; includeSubDomains; preload`
- SSL strict mode in `src/lib/db.ts`: `rejectUnauthorized: true` for production, CA certificate chain validation
- Cookie encryption service in `src/lib/auth/cookie-encryption.ts`
- Encryption format: `iv:ciphertext:authTag` (consistent with PII encryption)
- Key derivation: SHA-256 hash of `SESSION_SECRET`
- Legacy fallback: Graceful degradation to plain-text cookies during migration (30-day window)

**Rationale**: HSTS with preload prevents downgrade attacks and is a OWASP best practice. Strict SSL validation protects against man-in-the-middle attacks. Cookie encryption adds confidentiality layer beyond httpOnly/secure flags. Legacy fallback ensures zero-downtime deployment (no mass user logout).

### Wave 5: Key Rotation & Extended PII Encryption

**Decision**: Implement versioned encryption keys with gradual rotation and extend encryption to user-generated content fields.

**Implementation**:

- Versioned key format: `v{version}:{encrypted_data}` in encrypted fields
- Key rotation script `scripts/rotate-keys.ts` with dry-run default, batch processing, rollback support
- Extended encryption scope: `StudyKit.originalText`, `HtmlSnippet.content`
- Decrypt audit logging via `auditService.log()` with action `PII_DECRYPT_ACCESS`
- Fire-and-forget audit pattern (no await) to avoid blocking decrypt operations
- Audit metadata: `entityType`, `entityId`, `field`, `purpose`

**Rationale**: NIST SP 800-57 recommends periodic key rotation. Versioned keys enable zero-downtime rotation (old and new keys coexist during migration). Extending encryption to user-generated content protects against PII in student writings. Fire-and-forget audit logging provides GDPR Article 30 compliance trail without performance penalty (acceptable risk of lost events on crash).

### Wave 6: Azure Key Vault Integration

**Decision**: Integrate Azure Key Vault as primary secret store with environment variable fallback for graceful degradation.

**Implementation**:

- Azure SDK integration in `src/lib/security/azure-key-vault.ts`
- Dynamic `import()` for optional dependency (no SDK requirement in local dev)
- 5-minute TTL cache for secrets (balance between API costs and freshness)
- Fallback hierarchy: Azure Key Vault → Environment variable → Error
- Integration points: `encryption.ts`, `pii-encryption.ts`, `cookie-signing.ts`
- Secret naming: `PII-ENCRYPTION-KEY`, `SESSION-SECRET`, `ENCRYPTION-KEY` (hyphens in AKV, underscores in env)
- Verification script: `scripts/verify-encryption-backup.ts` (validate key equivalence)

**Rationale**: Azure Key Vault provides centralized secret management with RBAC, audit trail, and versioning (meets enterprise security requirements for SOC2/ISO27001 roadmap). Dynamic import allows local development without Azure credentials. 5-minute cache reduces API costs (from ~1000 to ~288 calls/day) while maintaining acceptable freshness for key rotation detection. Fallback ensures zero-downtime deployment during AKV outages.

## Consequences

### Positive

1. **Regulatory compliance**: Full GDPR Article 32 compliance for encryption at rest and in transit
2. **Defense in depth**: Multiple security layers protect against PII leakage (detection, anonymization, encryption)
3. **COPPA compliance**: Enhanced protection for children's personal information
4. **EU AI Act readiness**: Transparent PII handling for high-risk AI system classification
5. **Audit trail**: GDPR Article 30 compliance with decrypt access logging
6. **Key rotation capability**: NIST SP 800-57 compliant key lifecycle management
7. **Enterprise-grade secret management**: Azure Key Vault integration supports SOC2/ISO27001 roadmap
8. **Multi-locale support**: PII detection across 5 languages for cross-border data processing
9. **Zero-downtime deployments**: Gradual migration strategies (legacy cookie fallback, versioned keys, env var fallback)
10. **Developer experience**: Transparent encryption (Prisma middleware), optional AKV (dynamic imports), local dev friendly (fallbacks)

### Negative

1. **Performance overhead**:
   - Multi-locale PII detection: +5-10ms per message (regex pattern matching)
   - Dual-layer anonymization: +10-20ms per RAG operation (acceptable, 1-2% of total request time)
   - PII encryption at rest: +2-3ms per user operation (encrypt/decrypt + middleware)
   - Cookie encryption: +0.6ms per request (encrypt on set, decrypt on read)
   - Azure Key Vault: +50-100ms cold start, <1ms cached (5-minute TTL, 99% hit rate)
   - **Total**: ~20-30ms added latency per request (acceptable for security benefit)

2. **Complexity overhead**:
   - Prisma middleware setup and testing
   - Dynamic import error handling for Azure SDK
   - Versioned key format parsing and migration logic
   - Fire-and-forget audit logging (non-blocking pattern)
   - Legacy fallback maintenance (temporary, 30-day windows)

3. **Operational overhead**:
   - Key rotation procedures (quarterly/annual)
   - Azure Key Vault configuration and RBAC management
   - Insurance certificates (RC + cyber) for consortium readiness
   - Audit log retention and monitoring (30-day minimum)

4. **Storage overhead**:
   - Encrypted field size increase: ~6x for cookies, ~3x for PII fields (well below database limits)
   - `emailHash` column added to `User` table (SHA-256, 64 bytes)
   - Versioned key prefix adds ~6 bytes per encrypted field (`v1:`)

5. **Security trade-offs**:
   - Deterministic email hash reveals equality (acceptable: uniqueness already enforced, content not exposed)
   - 5-minute AKV cache delays secret rotation detection (acceptable: gradual rotation strategy)
   - Environment variable fallback less secure than Key Vault (acceptable: temporary, dev convenience)
   - Fire-and-forget audit may lose events on crash (acceptable: low crash frequency, performance priority)

## Related

- ADR 0004: Safety Guardrails and Content Moderation
- ADR 0015: State Management with Zustand (no localStorage for PII)
- ADR 0028: Migration to PostgreSQL with pgvector
- ADR 0033: RAG with Semantic Search
- ADR 0034: Chat Streaming Architecture
- ADR 0047: Grafana Cloud Enterprise Observability
- ADR 0058: Observability and KPIs
- ADR 0060: Accessibility Profiles Architecture
- ADR 0062: AI Compliance Framework
- ADR 0075: Cookie Handling Standards
- ADR 0077: Session Authentication Architecture
- ADR 0080: Security Audit Hardening
- ADR 0100: Multi-Country Compliance Architecture

## References

### Standards and Guidelines

- NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation (GCM)
- NIST SP 800-52 Rev 2: Guidelines for TLS Implementations
- NIST SP 800-57: Recommendation for Key Management
- NIST SP 800-122: Guide to Protecting the Confidentiality of PII
- OWASP Cryptographic Storage Cheat Sheet
- OWASP Transport Layer Protection Cheat Sheet
- OWASP Key Management Cheat Sheet
- OWASP Secrets Management Cheat Sheet

### Regulatory Framework

- GDPR Article 4(1): Definition of personal data
- GDPR Article 25: Data protection by design and by default
- GDPR Article 30: Records of processing activities
- GDPR Article 32: Security of processing (encryption requirement)
- EU AI Act 2024/1689: High-risk AI systems
- Italian Law 132/2025: AI transparency in education
- COPPA § 312.2: Personal information from children under 13

### Technical References

- RFC 6797: HTTP Strict Transport Security (HSTS)
- MDN Web Docs: Strict-Transport-Security header
- Azure Key Vault Documentation: https://learn.microsoft.com/azure/key-vault/
- ECMAScript 2018+ Unicode Property Escapes

### Internal Documentation

- `docs/compliance/DPIA.md` — Data Protection Impact Assessment
- `docs/compliance/AI-POLICY.md` — AI Transparency Policy
- `docs/compliance/MODEL-CARD.md` — AI Model Card
- `docs/compliance/AI-RISK-MANAGEMENT.md` — Risk Assessment
- `docs/security/DATA-BREACH-PROTOCOL.md` — Incident Response
- `docs/security/SECURITY-WHITEPAPER.md` — Security Architecture
