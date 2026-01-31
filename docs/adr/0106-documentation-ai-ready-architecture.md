# ADR 0106: Documentation AI-Ready Architecture

**Status**: Accepted
**Date**: 31 January 2026
**Context**: Plan P111 - Documentation Optimization

## Context

### The Problem: Documentation Token Explosion

MirrorBuddy had accumulated **~280 markdown documentation files** (~88,000 lines total), making AI agent consumption prohibitively expensive. Task executors were loading **~70,000 tokens of documentation per task**, causing:

- Slow task initialization (reading entire docs/)
- High token costs per task execution
- Duplicate information across multiple files
- Inconsistent organization making navigation difficult
- No clear distinction between "always needed" vs "on-demand" documentation

### Specific Pain Points

1. **No documentation hierarchy** - All files treated equally, no prioritization
2. **Massive duplication** - Same information repeated in multiple locations
3. **Obsolete content** - Historical docs mixed with current, no archival system
4. **Inconsistent formats** - No standard structure for different doc types
5. **Poor discoverability** - 90+ ADRs with no index, forced linear reading
6. **Process enforcement gaps** - Thor validation skipped for 3 waves, caught only by user review

## Decision

### 3-Tier Documentation Architecture

Implement a **token-optimized documentation hierarchy** with clear consumption patterns:

#### Tier 1: Always Loaded (~66 lines total)

- **CLAUDE.md** (project root) - Essential context, non-negotiable rules
- **~/.claude/CLAUDE.md** (global) - User preferences, cross-project standards
- **Auto-loaded on every task** - Zero agent decision required

#### Tier 2: Auto-Loaded by Context (~250 lines total)

- **.claude/rules/\*.md** (11 files) - Domain-specific rules
- **Automatically loaded when relevant** (e.g., i18n.md when editing translations)
- Examples: accessibility.md, tier.md, e2e-testing.md, cookies.md

#### Tier 3: On-Demand Only (<100 lines each)

- **@docs/claude/\*.md** (32 files) - Feature-specific deep dives
- **Only loaded when agent explicitly needs them** via `@docs/claude/<name>.md` syntax
- Strict format: Quick Reference table → Code Patterns → Examples

### Documentation Consolidation

#### Archived Obsolete Documentation

Created **docs-archive/** directory for:

- Historical setup guides (pre-2026)
- Superseded ADRs (replaced by newer decisions)
- Legacy deployment docs (pre-Vercel)

**Zero information loss** - All content preserved in git history, just moved out of active consumption path.

#### Consolidated Operational Docs

- **docs/i18n/**: 10 files → 4 files (removed duplicates, merged related content)
- **docs/operations/**: 27 files → 18 files (consolidated runbooks, merged metrics guides)

#### Created Navigation Indices

- **docs/adr/INDEX.md** (163 lines) - Domain-clustered ADR navigation replacing need to read 90+ individual ADRs
- **src/DOCS-INDEX.md** (new) - Index for 20 embedded source documentation files

### @docs/claude/ Standard Format

Every on-demand documentation file MUST follow this structure:

```markdown
# Feature Name

Quick Reference table (most common operations, <20 lines)
Code Patterns (copy-paste examples, <30 lines)
When to Use / When to Avoid (decision guide, <15 lines)
Common Issues (troubleshooting, <20 lines)
References (links to ADRs/code, <10 lines)

TOTAL: <100 lines
```

**Key principle**: Table-first, code-second, prose-minimal.

### Process Enforcement Addition

Added **mandatory Thor validation** to global CLAUDE.md workflow:

- Per-wave Thor gate (lint + typecheck + build)
- Blocking before wave completion
- No "trust but don't verify" - validation is mandatory

**Trigger**: Thor validation was skipped for 3 consecutive waves in Plan 109, caught only during user final review. This created technical debt that should have been caught immediately.

## Implementation

### Files Created/Modified

| File                 | Type    | Purpose                                       |
| -------------------- | ------- | --------------------------------------------- |
| `docs/adr/INDEX.md`  | New     | Domain-clustered ADR navigation               |
| `src/DOCS-INDEX.md`  | New     | Source docs index                             |
| `@docs/claude/*.md`  | New     | 32 on-demand documentation files              |
| `.claude/rules/*.md` | Updated | Converted to auto-load format                 |
| `CLAUDE.md`          | Updated | Added Thor enforcement, optimized to 66 lines |
| `docs-archive/`      | New     | Historical docs preservation                  |

### Migration Statistics

| Metric              | Before         | After        | Delta  |
| ------------------- | -------------- | ------------ | ------ |
| Total doc files     | ~280           | ~120         | -57%   |
| Always-loaded lines | ~88,000        | ~316         | -99.6% |
| Average tokens/task | ~70,000        | <2,500       | -96.4% |
| ADR discovery time  | Read 90+ files | Read 1 index | -98.9% |
| On-demand docs      | 0              | 32           | +32    |

### @docs/claude/ Coverage

Created 32 on-demand documentation files covering:

**Core Features** (8 files):

- mirrorbuddy.md, tools.md, database.md, api-routes.md, knowledge-hub.md, rag.md, safety.md, validation.md

**Specialized Features** (11 files):

- voice-api.md, ambient-audio.md, onboarding.md, learning-path.md, pomodoro.md, notifications.md, parent-dashboard.md, session-summaries.md, summary-tool.md, conversation-memory.md, pdf-generator.md, gamification.md

**Characters** (3 files):

- buddies.md, coaches.md, adding-maestri.md

**Infrastructure** (6 files):

- tier.md, mobile-readiness.md, vercel-deployment.md, cookies.md, operations.md

**Compliance** (1 file):

- accessibility.md

**Beta** (1 file):

- trial-mode.md

## Consequences

### Positive

1. **Massive token savings** - 96.4% reduction in per-task documentation consumption
2. **Zero information loss** - All content preserved in docs-archive/ with full git history
3. **Faster agent initialization** - Load only what's needed when needed
4. **Better discoverability** - Domain indices replace linear file scanning
5. **Consistent structure** - Every @docs/claude/ file follows same template
6. **Process enforcement** - Thor validation now mandatory, catches issues immediately
7. **Scalability** - New features add one <100-line file, not sprawling documentation

### Negative

1. **Maintenance burden** - @docs/claude/ files must stay synchronized with code changes
2. **Learning curve** - New contributors need to understand 3-tier system
3. **Potential staleness** - On-demand docs might lag behind rapid feature changes without vigilance
4. **Index maintenance** - ADR INDEX.md and DOCS-INDEX.md need updates when adding entries

### Mitigation Strategies

1. **Sync enforcement** - PR template includes "Update @docs/claude/ if public API changed"
2. **Version pinning** - Each @docs/claude/ file includes "Last updated" date
3. **Automated checks** - CI warns if public exports changed but no @docs/ update
4. **Quarterly audits** - Scheduled review of all on-demand docs for accuracy

## Thor Validation Enforcement

### Background

During Plan 109 (Push-CI-Knowledge), Thor validation was **skipped for 3 consecutive waves**:

- Wave 1 (Documentation Audit) - Skipped
- Wave 2 (Core Optimization) - Skipped
- Wave 3 (Verification) - Skipped

**Root cause**: Thor was positioned as "optional quality check" rather than mandatory gate.

**Discovery**: User caught multiple issues during final review that Thor would have flagged immediately (type errors, broken imports, lint violations).

### Fix: Mandatory Thor Gate

Updated **~/.claude/CLAUDE.md** workflow (Step 5):

```markdown
5. Thor validation per wave → `plan-db.sh validate {id}` + build + tests
```

**Enforcement**:

- Thor must PASS before wave marked complete
- No exceptions for "documentation-only" waves
- Failures block progression to next wave

**Rationale**: Even documentation changes can break builds (broken links, invalid examples). Thor catches these immediately, preventing debt accumulation.

## References

- Plan 111: Documentation Optimization (this plan)
- Plan 109: Push-CI-Knowledge (Thor validation gap discovered)
- ADR 0082: i18n Namespace Structure
- ADR 0104: i18n Namespace Wrapper Key Convention
- Global CLAUDE.md: 3-tier documentation consumption model
- File: `docs/adr/INDEX.md` (domain-clustered navigation)
- File: `src/DOCS-INDEX.md` (source docs index)
