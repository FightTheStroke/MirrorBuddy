# ADR 0045: Domain Boundaries and Module Organization

## Status

Accepted

## Context

Microsoft engineer feedback highlighted need for "modulazione più netta e ownership chiara"
(clearer modulation and ownership). This ADR documents the domain boundaries established
for MirrorBuddy to support the 7→10 production hardening initiative.

## Decision

### Domain Structure

MirrorBuddy is organized into the following domains under `src/lib/`:

| Domain            | Path                     | Responsibility                                     | CODEOWNERS |
| ----------------- | ------------------------ | -------------------------------------------------- | ---------- |
| **Safety**        | `src/lib/safety/`        | Content filtering, PII detection, harm prevention  | @roberdan  |
| **Security**      | `src/lib/security/`      | CSP nonce, authentication, encryption              | @roberdan  |
| **Privacy**       | `src/lib/privacy/`       | GDPR compliance, data retention, anonymization     | @roberdan  |
| **AI**            | `src/lib/ai/`            | Character routing, intent detection, summarization | @roberdan  |
| **Education**     | `src/lib/education/`     | FSRS, adaptive difficulty, learning algorithms     | @roberdan  |
| **RAG**           | `src/lib/rag/`           | Embeddings, semantic search, vector store          | @roberdan  |
| **Auth**          | `src/lib/auth/`          | Session validation, admin checks, CSRF protection  | @roberdan  |
| **Tier**          | `src/lib/tier/`          | Trial/Base/Pro feature gating, quota enforcement   | @roberdan  |
| **Accessibility** | `src/lib/accessibility/` | 7 DSA profiles, WCAG compliance                    | @roberdan  |
| **Compliance**    | `src/lib/compliance/`    | Audit logging, policy enforcement, risk management | @roberdan  |

### Protected Modules (10 total)

The following modules are protected by ESLint rules enforcing module boundaries and dependency direction:

**CORE Layer** (no dependencies on other lib modules):

- `safety` — Content filtering, PII detection, harm prevention
- `security` — CSP nonce, authentication primitives, encryption
- `privacy` — GDPR compliance, data retention, anonymization

**FEATURE Layer** (may depend on CORE + FEATURE):

- `ai` — Character routing, intent detection, summarization
- `education` — FSRS, adaptive difficulty, learning algorithms
- `rag` — Embeddings, semantic search, vector store

**CROSS-CUTTING Layer** (may depend on CORE + FEATURE + CROSS):

- `auth` — Session validation, admin checks, CSRF (universal access, no restrictions)
- `tier` — Trial/Base/Pro feature gating, quota enforcement
- `accessibility` — 7 DSA profiles, WCAG compliance
- `compliance` — Audit logging, policy enforcement, risk management

### Dependency Matrix

| From ↓ / To →     | safety | security | privacy | ai  | education | rag | auth | tier | a11y | compliance |
| ----------------- | ------ | -------- | ------- | --- | --------- | --- | ---- | ---- | ---- | ---------- |
| **safety**        | —      | ✗        | ✗       | ✗   | ✗         | ✗   | ✗    | ✗    | ✗    | ✗          |
| **security**      | ✗      | —        | ✗       | ✗   | ✗         | ✗   | ✗    | ✗    | ✗    | ✗          |
| **privacy**       | ✗      | ✗        | —       | ✗   | ✗         | ✗   | ✗    | ✗    | ✗    | ✗          |
| **ai**            | ✓      | ✓        | ✓       | —   | ✗         | ✓   | ✓    | ✓\*  | ✗    | ✗          |
| **education**     | ✓      | ✓        | ✓       | ✗   | —         | ✗   | ✓    | ✓\*  | ✗    | ✗          |
| **rag**           | ✓      | ✓        | ✓       | ✗   | ✗         | —   | ✓    | ✗    | ✗    | ✗          |
| **auth**          | ✓      | ✓        | ✓       | ✓   | ✓         | ✓   | —    | ✓    | ✓    | ✓          |
| **tier**          | ✓      | ✓        | ✓       | ✗   | ✗         | ✗   | ✓    | —    | ✗    | ✗          |
| **accessibility** | ✓      | ✓        | ✓       | ✓   | ✓         | ✓   | ✓    | ✓    | —    | ✓          |
| **compliance**    | ✓      | ✓        | ✓       | ✓   | ✓         | ✓   | ✓    | ✓    | ✓    | —          |

✓ = Allowed | ✗ = Blocked | \* = Accepted exception (documented with eslint-disable)

**Accepted Exceptions** (3 total):

1. `ai → tier` — Character availability gating (src/lib/ai/maestri-registry.ts)
2. `education → tier` — FSRS quota enforcement (src/lib/education/fsrs.ts)
3. `education → tier` — Pomodoro tracking limits (src/lib/education/pomodoro-service.ts)

All exceptions are documented with `// eslint-disable-next-line @typescript-eslint/no-restricted-imports` and rationale comments.

### Boundary Rules

1. **Barrel Exports**: Each protected module MUST have an `index.ts` with JSDoc describing public API
2. **No Circular Imports**: Cross-domain imports must be one-directional (enforced by madge)
3. **Dependency Direction**:
   - CORE (safety, security, privacy) → No dependencies on other lib modules
   - FEATURE (ai, education, rag) → May depend on CORE + FEATURE modules
   - CROSS (auth, tier, accessibility, compliance) → May depend on CORE + FEATURE + CROSS modules
   - `auth` is universal: all modules may import from auth without restriction
4. **ESLint Enforcement**:
   - `enforce-module-boundaries` (error level) — Blocks imports from protected modules without barrel export
   - `enforce-dependency-direction` (warn level) — Validates layer-based dependency flow per matrix above

### Client/Server Barrel Split

Next.js Turbopack cannot tree-shake barrel re-exports. If a barrel (`index.ts`) re-exports
both client-safe and server-only code (prisma, `next/headers`, `server-only`), any client
component importing from that barrel causes a build failure.

**Solution**: Each module with server-only code has two barrels:

| File        | Contains                            | Consumers                           |
| ----------- | ----------------------------------- | ----------------------------------- |
| `index.ts`  | Client-safe exports only            | Client components, stores, hooks    |
| `server.ts` | Re-exports from index + server-only | API routes, server components, cron |

**Modules with server.ts** (8 of 10):
`auth`, `tier`, `ai`, `safety`, `compliance`, `education`, `rag`, `privacy`

**Modules without server.ts** (2 of 10):
`security`, `accessibility` — no server-only dependencies

```typescript
// server.ts pattern:
export * from "./index"; // all client-safe exports
export { validateAuth } from "./session-auth"; // server-only
```

### Import Rules

```typescript
// GOOD: Client component imports from barrel
import { csrfFetch } from "@/lib/auth";

// GOOD: API route imports from server barrel
import { validateAuth } from "@/lib/auth/server";

// BAD: Import internal module directly
import { validateAuth } from "@/lib/auth/session-auth";
```

### CI Enforcement

Module boundaries are enforced through multiple mechanisms:

1. **ESLint Rules** (configured in `eslint.config.mjs`):
   - `enforce-module-boundaries` (error level) — Prevents direct imports from protected module internals. All 465 original violations were fixed in Plan 136.
   - `enforce-dependency-direction` (warn level) — Validates layer-based dependency flow per the matrix above.

2. **Circular Import Detection**: Madge scans for circular dependencies in CI (see `.github/workflows/ci.yml`).

3. **Pre-commit Hooks**: ESLint runs on staged files, blocking commits with boundary violations.

## Consequences

### Positive

- Clear ownership via CODEOWNERS
- Easier onboarding for new developers
- Reduced coupling between modules
- Better testability (mock at domain boundaries)

### Negative

- Additional barrel export maintenance
- May require refactoring existing imports
- CI time increased slightly for circular import detection

## References

- F-08: Feature modules con boundaries chiari
- F-09: CODEOWNERS per ownership chiara
- F-11: Domain boundaries, no circular imports
- Plan 136: Module Boundaries Enforcement (465→0 violations)
- ESLint Rules: `enforce-module-boundaries` (error), `enforce-dependency-direction` (warn)
- Microsoft ISE Engineering Fundamentals: https://microsoft.github.io/code-with-engineering-playbook/
