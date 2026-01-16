---
name: app-release-manager-execution
description: Execution phases (3-5) for app-release-manager. Reference module.
model: opus
---

# RELEASE MANAGER - Execution Phases

Reference module for `app-release-manager`. Contains manual validation and release steps.

---

## PHASE 3: EDUCATION-SPECIFIC VALIDATION (P0)

Manual verification required:

### Student Safety (ADR-0004)
- [ ] All 17 maestri respond appropriately
- [ ] Safety guardrails block inappropriate content
- [ ] Crisis keywords trigger helpline info (Telefono Azzurro: 19696)
- [ ] `injectSafetyGuardrails()` used in all AI prompts
- [ ] Memory injection cannot override safety rules
- [ ] Jailbreak detector catches adversarial inputs

**Verification command:**
```bash
npm test -- run src/lib/safety/__tests__/
# Should pass ALL safety tests (150+)
```

### GDPR Compliance (Minors)
- [ ] Parent dashboard shows consent status
- [ ] Data export works (JSON/PDF) - `/api/user/export`
- [ ] Right to erasure honored - `/api/user/delete`
- [ ] Knowledge Hub data can be exported
- [ ] Memory data respects consent
- [ ] Audit logging enabled for new endpoints

**Verification command:**
```bash
grep -r "mirrorbuddy-user-id" src/app/api/ --include="*.ts" | wc -l
# All API routes should check user auth
```

### WCAG 2.1 AA Compliance
- [ ] All new components have keyboard navigation
- [ ] ARIA labels present on interactive elements
- [ ] Color contrast >= 4.5:1
- [ ] Focus indicators visible
- [ ] Screen reader compatible

**Verification command:**
```bash
npm test -- run e2e/accessibility*.spec.ts
# Should pass Axe accessibility audit
```

### Educational Quality
- [ ] Flashcard FSRS intervals are correct
- [ ] Progress tracking updates XP/levels
- [ ] Mind maps render with correct title and hierarchy (ADR-0020)
- [ ] Knowledge Hub renderers show content (not JSON) (ADR-0022)
- [ ] Conversational memory persists across sessions (ADR-0021)

### Platform Knowledge Base (Issue #16)
- [ ] `src/data/app-knowledge-base.ts` updated with new features
- [ ] `APP_VERSION.lastUpdated` matches release date (YYYY-MM)
- [ ] New troubleshooting entries for known issues
- [ ] Coach can answer "Come funziona [new feature]?" correctly

**Verification command:**
```bash
grep "lastUpdated" src/data/app-knowledge-base.ts
# Should show current month: '2026-01' or later
```

### E2E Educational Flows
- [ ] Mindmap creation flow works (voice + text)
- [ ] Quiz generation and scoring works
- [ ] Flashcard review with FSRS works
- [ ] Knowledge Hub search finds materials
- [ ] Collection and tag organization works

---

## PHASE 4: RELEASE

Only after ALL phases pass:

```bash
# Version bump
npm run version:patch  # or :minor / :major

# Verify CHANGELOG.md is updated

# Create release
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin main --tags

# GitHub Release via gh CLI
gh release create vX.Y.Z --generate-notes
```

---

## FAILURE PROTOCOL

If ANY P0 check fails:
1. STOP immediately
2. Fix the issue
3. Re-run from Phase 1

Never ship with known P0 issues. Educational software = higher standards.

---

## ISE REFERENCE

This project follows Microsoft's ISE Engineering Fundamentals:
https://microsoft.github.io/code-with-engineering-playbook/

*Personal project with NO Microsoft affiliation.*

---

## CRITICAL LEARNINGS

See `mirrorbuddy-hardening-checks.md` for post-mortem learnings (2026-01-03).

**Quick validation**:
```bash
# Plan completion check
for f in docs/plans/done/*.md; do
  unchecked=$(grep -c '\[ \]' "$f" 2>/dev/null || echo 0)
  [ "$unchecked" -gt 0 ] && echo "BLOCKED: $f has $unchecked unchecked items"
done
```

**RULE: No proof = BLOCKED.**
