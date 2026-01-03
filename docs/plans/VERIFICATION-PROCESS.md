# Verification Process - Preventing False Completions

> **Post-mortem 2026-01-03**: 32 bugs shipped despite "all tests passing" and plans marked "COMPLETED".
> This document establishes mandatory verification steps.

---

## The Problem

Plans were moved to `done/` with:
- Header marked "✅ COMPLETED"
- Internal tasks still `[ ]` unchecked
- Zero manual testing executed
- E2E tests that only verify "page loads" not "feature works"

**Result**: 32 bugs shipped. 0 of 6 claimed fixes actually worked.

---

## Mandatory Verification Checklist

Before ANY plan can be moved to `done/`:

### 1. Internal Task Check
```bash
# Run this on the plan file
grep -c '\[ \]' docs/plans/doing/[PlanName].md

# If result > 0, plan is NOT complete
```

**Rule**: Every `[ ]` must become `[x]` before completion.

### 2. Manual Test Evidence
For each feature, document:
- [ ] Screenshot or video showing feature working
- [ ] Console output showing no errors
- [ ] User flow completed successfully

### 3. Automated Test Requirements

**Old (BAD) pattern**:
```javascript
await page.click('text=Feature');
await page.waitForTimeout(1000);
// No assertion!
```

**New (REQUIRED) pattern**:
```javascript
await page.click('text=Feature');
const result = page.locator('.feature-output');
await expect(result).toBeVisible();
await expect(result).toContainText('expected value');
```

### 4. Build Verification
```bash
npm run typecheck && npm run lint && npm run build
# ALL must pass with 0 errors, 0 warnings
```

---

## Pre-Move Script

Run before moving ANY plan to `done/`:

```bash
#!/bin/bash
# verify-plan.sh

PLAN_FILE=$1

if [ -z "$PLAN_FILE" ]; then
  echo "Usage: ./verify-plan.sh path/to/plan.md"
  exit 1
fi

echo "=== VERIFICATION CHECK ==="

# Check unchecked boxes
UNCHECKED=$(grep -c '\[ \]' "$PLAN_FILE" 2>/dev/null || echo 0)
if [ "$UNCHECKED" -gt 0 ]; then
  echo "FAIL: $UNCHECKED unchecked tasks found"
  grep '\[ \]' "$PLAN_FILE"
  exit 1
fi
echo "PASS: All tasks checked"

# Check for PLACEHOLDER/MOCK in codebase
PLACEHOLDERS=$(grep -ri 'PLACEHOLDER\|MOCK_DATA' src/ --include="*.ts" --include="*.tsx" | wc -l)
if [ "$PLACEHOLDERS" -gt 0 ]; then
  echo "WARN: $PLACEHOLDERS PLACEHOLDER/MOCK references found"
  grep -ri 'PLACEHOLDER\|MOCK_DATA' src/ --include="*.ts" --include="*.tsx" | head -5
fi

# Run build verification
echo "Running build verification..."
npm run typecheck 2>&1 | tail -5
npm run lint 2>&1 | tail -5
npm run build 2>&1 | tail -5

echo "=== VERIFICATION COMPLETE ==="
```

---

## Plan File Status Indicators

### In Progress (`doing/`)
```markdown
# Plan Name
Status: IN PROGRESS

## Tasks
- [x] Task 1 (completed)
- [ ] Task 2 (not done)
- [ ] Task 3 (not done)
```

### Ready for Review
```markdown
# Plan Name
Status: READY FOR REVIEW

## Tasks
- [x] Task 1
- [x] Task 2
- [x] Task 3

## Verification
- [x] All tasks checked
- [x] Build passes
- [x] Tests pass
- [x] Manual testing done
```

### Actually Complete (`done/`)
```markdown
# Plan Name
Status: COMPLETED
Verified: 2026-01-03 by [name]

## Tasks
- [x] Task 1
- [x] Task 2
- [x] Task 3

## Evidence
- Build: npm run build passed at 14:30
- Tests: 130 passed, 0 failed
- Manual: Tested feature X, Y, Z - all working
```

---

## Thor Quality Gate Integration

Before merging or releasing, Thor agent must verify:

1. **No unchecked tasks** in done/ plans
2. **No PLACEHOLDER/MOCK** in production code
3. **All tests have assertions** (not just loading checks)
4. **Build/lint/typecheck pass**

See: `~/.claude/agents/core_utility/thor-quality-assurance-guardian.md`

---

## App Release Manager Integration

Release manager must run false completion detector:

```bash
# Check for false completions
for f in docs/plans/done/*.md; do
  unchecked=$(grep -c '\[ \]' "$f" 2>/dev/null || echo 0)
  if [ "$unchecked" -gt 0 ]; then
    echo "BLOCKED: $f has $unchecked unchecked items"
  fi
done
```

See: `~/.claude/agents/release_management/app-release-manager.md`

---

## Consequences of Violation

1. **First offense**: Plan moved back to `doing/`, must complete properly
2. **Repeat**: All future claims require proof (screenshots, test output)
3. **Pattern**: Session review, process adjustment

---

## Quick Reference

| Check | Command | Expected |
|-------|---------|----------|
| Unchecked tasks | `grep -c '\[ \]' plan.md` | 0 |
| PLACEHOLDER | `grep -ri PLACEHOLDER src/` | 0 matches |
| MOCK_DATA | `grep -ri MOCK_DATA src/` | 0 matches |
| Build | `npm run build` | Exit 0 |
| Typecheck | `npm run typecheck` | Exit 0 |
| Lint | `npm run lint` | Exit 0 |

---

**Remember**: A checked box without working code is a lie. Verify everything.
