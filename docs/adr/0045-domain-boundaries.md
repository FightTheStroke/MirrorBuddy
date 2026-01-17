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

| Domain            | Path                     | Responsibility                                      | CODEOWNERS |
| ----------------- | ------------------------ | --------------------------------------------------- | ---------- |
| **Safety**        | `src/lib/safety/`        | Content filtering, PII detection, harm prevention   | @roberdan  |
| **Security**      | `src/lib/security/`      | CSP nonce, authentication, encryption               | @roberdan  |
| **Privacy**       | `src/lib/privacy/`       | GDPR compliance, data retention, anonymization      | @roberdan  |
| **AI**            | `src/lib/ai/`            | Character routing, intent detection, summarization  | @roberdan  |
| **Education**     | `src/lib/education/`     | FSRS, adaptive difficulty, learning algorithms      | @roberdan  |
| **RAG**           | `src/lib/rag/`           | Embeddings, semantic search, vector store           | @roberdan  |
| **Accessibility** | `src/lib/accessibility/` | 7 DSA profiles, WCAG compliance                     | @roberdan  |
| **PDF Generator** | `src/lib/pdf-generator/` | Accessible PDF export, dyslexia-friendly formatting | @roberdan  |
| **Tools**         | `src/lib/tools/`         | Plugin system, tool registry, orchestration         | @roberdan  |

### Boundary Rules

1. **Barrel Exports**: Each domain MUST have an `index.ts` that exports only public API
2. **No Circular Imports**: Cross-domain imports must be one-directional
3. **Dependency Direction**:
   - Core domains (safety, security, privacy) → No external lib dependencies
   - Feature domains (ai, education, rag) → May depend on core domains
   - UI domains (tools, pdf-generator) → May depend on feature domains

### Import Rules

```typescript
// GOOD: Import from barrel
import { detectHarm } from "@/lib/safety";

// BAD: Import internal module
import { detectHarm } from "@/lib/safety/harm-detection";
```

### CI Enforcement

Circular imports are detected in CI via `madge` (see `.github/workflows/ci.yml`).

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
- Microsoft ISE Engineering Fundamentals: https://microsoft.github.io/code-with-engineering-playbook/
