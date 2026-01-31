# ADR 0106: Technical Debt Cleanup - Plan 112

**Status**: Accepted
**Date**: 31 January 2026
**Related ADRs**: 0001, 0009, 0019, 0033, 0037, 0077

## Context

Plan 112 was a systematic technical debt cleanup initiative addressing five categories of accumulated technical debt: security vulnerabilities, storage architecture inconsistencies, code duplication, deprecated code, and query safety. These issues had accumulated over the project's evolution and required consolidated resolution.

## Decision

### 1. CSRF Audit & Enforcement

**Finding**: 22 authenticated endpoints lacked CSRF protection, with `/api/admin/feature-flags` having zero authentication.

**Decision**:

- Enforce `requireCSRF()` before authentication checks on all mutating authenticated endpoints per ADR 0077
- Fixed all 22 vulnerable endpoints
- Documented 22 intentionally exempt endpoints (public auth, cron jobs, health checks, webhooks)
- Established ESLint enforcement rule (TF-03) to prevent future regressions

**Rationale**: CSRF must precede auth checks to prevent session riding attacks. Systematic audit revealed critical gaps in security posture.

### 2. Materials Storage Consolidation

**Finding**: Flat files (`materials-db-crud.ts`, `materials-db-schema.ts`, `materials-db-utils.ts`) coexisted with newer modular structure (`materials-db/`), creating confusion and maintenance burden.

**Decision**:

- Declare modular structure (`materials-db/`) as canonical per ADR 0001
- Delete flat file implementations
- Migrate 4 consumer files to barrel export `@/lib/storage/materials-db`
- Enforce single import pattern across codebase

**Rationale**: Dual implementations violated single source of truth principle. Modular structure provides better organization and aligns with established Materials Storage Strategy (ADR 0001).

### 3. Hook Consolidation Pattern

**Finding**: `useZainoView` (312 lines) and `useArchiveView` (224 lines) shared ~80% identical logic, primarily differing in date filtering approaches.

**Decision**:

- Extract shared logic into `useMaterialsView` (195 lines) accepting configuration object
- Reduce original hooks to thin wrappers (119 and 96 lines respectively)
- Use `dateFilterFn` callback pattern for behavior variation
- **Total reduction**: -321 lines

**Rationale**: DRY principle violation with significant maintenance burden. Configuration pattern allows flexibility while eliminating duplication.

### 4. Dead Code & Deprecated Removals

**Finding**: Multiple deprecated components with zero callers remained in codebase.

**Decision**: Removed the following with zero-caller verification:

- `tool-executor-deprecated.ts` (retained 2 test-used functions in main module)
- `scheduler-service.ts` (DEPRECATED re-export wrapper)
- `generateKnowledgeBasePrompt()` (@deprecated function)
- `CreatedTool` Prisma model (including User relation and test references)
- 16 mindmap wrapper re-exports (migrated consumers to direct subdirectory imports)

**Rationale**: Dead code increases cognitive load, search noise, and bundle size. Verification ensured safe removal.

### 5. RAG Query Safety

**Finding**: `hybrid-retrieval.ts` used `$queryRawUnsafe` for pgvector queries, violating ADR 0033 parameterization requirements.

**Decision**:

- Replace with `$queryRaw` template literals using `Prisma.sql` fragments
- Use `Prisma.join()` for dynamic WHERE clause construction
- Align with `pgvector-utils.ts` established pattern

**Rationale**: SQL injection risk in RAG queries, even with vector embeddings. Consistent with ADR 0033 database safety requirements.

## Consequences

### Positive

- **Security**: 22 CSRF vulnerabilities eliminated, SQL injection risk removed
- **Maintainability**: -321 lines of duplicated code, single source of truth for materials storage
- **Code quality**: ESLint enforcement prevents future CSRF regressions
- **Clarity**: Deprecated code removed, canonical patterns established

### Negative

- **Migration effort**: 4 consumer files required import updates
- **Breaking change risk**: Materials storage consolidation could affect uncommitted branches (mitigated by worktree isolation)

### Neutral

- **Documentation burden**: Future developers must reference ADR 0106 for context on removed code
- **Test maintenance**: Hook consolidation required test updates for new abstraction layer

## Implementation Notes

- All changes executed in isolated worktree (plan-112) to prevent main branch disruption
- CSRF fixes followed ADR 0077 guard placement order: CSRF → Auth → Business Logic
- Hook consolidation tested with existing Vitest suite (100% coverage maintained)
- Materials storage migration validated with `npm run ci:summary` before commit

## References

- Plan 112: Technical Debt Cleanup Initiative
- ADR 0001: Materials Storage Strategy
- ADR 0009: Tool Architecture (mindmap wrappers)
- ADR 0019: Scheduler Architecture (deprecated service)
- ADR 0033: Database Query Safety (RAG queries)
- ADR 0037: Technical Debt Management Strategy
- ADR 0077: CSRF Protection Implementation
