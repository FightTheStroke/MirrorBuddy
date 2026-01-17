---
name: app-release-manager-execution
description: Execution phases (3-5) for app-release-manager. Reference module.
model: opus-4.5
---

# RELEASE MANAGER - Execution Phases

Reference module for `app-release-manager`. Contains manual validation and release steps.

---

## PHASE 4: EDUCATION-SPECIFIC VALIDATION (P0)

Manual verification required:

### Student Safety (ADR-0004)
- [ ] All 20 maestri/amici respond appropriately
- [ ] Safety guardrails block inappropriate content
- [ ] Crisis keywords trigger helpline info (Telefono Azzurro: 19696)
- [ ] `injectSafetyGuardrails()` used in all AI prompts
- [ ] Memory injection cannot override safety rules
- [ ] Jailbreak detector catches adversarial inputs

**Verification command:**
```bash
npm run test:unit -- src/lib/safety/__tests__/
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
npx playwright test e2e/accessibility.spec.ts
# Must pass ALL 24 tests (axe-core WCAG 2.1 AA, keyboard nav, screen reader, DSA profiles)
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

## PHASE 5: TESTING GAP VALIDATION (P0 - BLOCKING)

> Added 2026-01-17: Assessment revealed ZERO tests for critical paths.

### 5.1 Authentication Tests (MANDATORY)

OAuth flow must have tests:
```bash
# Verify auth tests exist
ls src/app/api/auth/**/__tests__/*.test.ts 2>/dev/null || ls e2e/*auth*.spec.ts 2>/dev/null
# MUST find test files
```

Required test coverage:
- [ ] CSRF token validation
- [ ] State parameter verification
- [ ] Redirect URL validation
- [ ] Token refresh flow
- [ ] Session fixation prevention

### 5.2 Cron Job Tests (MANDATORY)

Data retention cron must be tested:
```bash
# Verify cron tests exist
ls src/app/api/cron/**/__tests__/*.test.ts 2>/dev/null
# MUST find test files
```

Required test coverage:
- [ ] CRON_SECRET authentication
- [ ] Multi-phase deletion logic
- [ ] Audit trail creation
- [ ] Edge cases (user not found, partial deletion)

### 5.3 Critical API Route Tests (MANDATORY)

Core features must have E2E tests:
```bash
# Verify critical API tests
grep -rn "chat/stream\|realtime/start\|learning-path" e2e/*.spec.ts
# MUST find tests for these routes
```

Required test coverage:
- [ ] `/api/chat/stream` - streaming works, budget enforced
- [ ] `/api/realtime/start` - voice session initiates
- [ ] `/api/learning-path/*` - path creation and progress
- [ ] `/api/gamification/*` - XP and achievements

### 5.4 Coverage Enforcement

```bash
# Verify coverage meets threshold
npm run test:coverage
# Statements: ≥80%
# Branches: ≥70%
# Functions: ≥75%
# Lines: ≥80%
```

**If ANY test gap exists: STOP. Write tests first.**

---

## PHASE 5.5: CODE QUALITY VALIDATION (P1)

### localStorage Audit (ADR 0015)

```bash
# Find all localStorage usage
grep -rn "localStorage\." src/ --include="*.ts" --include="*.tsx" | grep -v test | grep -v __tests__
# Each usage must be documented exception (cache, permissions) NOT user data
```

Legitimate uses (OK):
- Transport cache (WebRTC probe results)
- Permission cache (browser permissions)
- PWA banner dismissal

Violations (BLOCKED):
- User profile data
- Conversation history
- Progress/XP data

### Empty Catch Blocks

```bash
# Find empty catch blocks
grep -rn "catch.*{}" src/ --include="*.ts" --include="*.tsx" | grep -v test
# MUST return 0 results (all catch blocks must log)
```

### Console.log Cleanup

```bash
# Find console statements (excluding logger)
grep -rn "console\.\(log\|error\|warn\)" src/ --include="*.ts" --include="*.tsx" | grep -v test | grep -v logger
# MUST return 0 results in production code
```

---

## PHASE 6: RELEASE SCORECARD (P0)

**No proof = BLOCKED.** Store evidence in `docs/releases/<version>/` or equivalent.

### Required Artifacts
- [ ] `npm run release:gate` full log captured
- [ ] Coverage report saved (`coverage/index.html` or `coverage/coverage-summary.json`)
- [ ] Playwright report saved (`playwright-report/index.html`)
- [ ] Perf check output saved (from `./scripts/perf-check.sh`)
- [ ] Manual QA screenshots for key flows (mindmap, quiz, flashcards, knowledge hub)
- [ ] Security audit output saved (`npm audit --audit-level=high`)

### Security Artifacts (NEW)
- [ ] CSP header screenshot/curl output
- [ ] CSRF token in form screenshot
- [ ] Rate limit test output (100 requests, proper 429 response)
- [ ] COPPA consent flow recording/screenshots

If any artifact is missing, release is blocked.

---

## PHASE 7: RELEASE

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

See `mirrorbuddy-hardening-checks.md` for post-mortem learnings.

**Quick validation**:
```bash
# Plan completion check
for f in docs/plans/done/*.md; do
  unchecked=$(grep -c '\[ \]' "$f" 2>/dev/null || echo 0)
  [ "$unchecked" -gt 0 ] && echo "BLOCKED: $f has $unchecked unchecked items"
done
```

**RULE: No proof = BLOCKED.**
