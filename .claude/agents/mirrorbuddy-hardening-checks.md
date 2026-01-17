---
name: mirrorbuddy-hardening-checks
description: Production hardening validation for MirrorBuddy releases. Used by app-release-manager.
tools: ["Read", "Grep", "Glob", "Bash", "Task"]
model: opus-4.5
---

# Hardening Checks - MirrorBuddy

Reference module for `app-release-manager`. Contains post-mortem learnings.

---

## CRITICAL LEARNINGS (2026-01-03 Post-Mortem)

> **32 bugs shipped despite "all tests passing". Here's why and how to prevent it.**

### Learning 1: FALSE COMPLETION PATTERN

**What happened**: Plans in `docs/plans/done/` marked "✅ COMPLETED" in header, but:
- Internal tasks still `[ ]` unchecked
- `MasterPlan-v2.1` claimed bugs 0.1-0.6 fixed → ALL 6 still broken
- `ManualTests-Sprint` in done/ → ZERO tests actually executed (all "⬜ Non testato")

**Mandatory Check Before Release**:
```bash
# Verify plan files have no unchecked items
for f in docs/plans/done/*.md; do
  unchecked=$(grep -c '\[ \]' "$f" 2>/dev/null || echo 0)
  if [ "$unchecked" -gt 0 ]; then
    echo "BLOCKED: $f has $unchecked unchecked items but is in done/"
  fi
done
```

### Learning 2: SMOKE TEST DECEPTION

**What happened**: 130 E2E tests PASSED. 32 real bugs existed.
- Tests verified "page loads without crash" ✓
- Tests did NOT verify "feature actually works" ✗

**Bad test (reject)**:
```javascript
await page.click('text=Mappe Mentali');
await page.waitForTimeout(1000);
// No assertion!
```

**Good test (require)**:
```javascript
await page.click('text=Mappe Mentali');
await expect(page.locator('.mindmap-container svg')).toBeVisible();
await expect(page.locator('.mindmap-node')).toHaveCount.greaterThan(1);
```

### Learning 3: PROOF OR BLOCK

**What counts as proof**:
- Actual test output (not "tests passed")
- Screenshots showing feature working
- `grep` output showing code exists

**What does NOT count**:
- "I fixed it" (show the test)
- "Tests pass" (show the output)
- "✅ COMPLETED" header (check internal `[ ]`)

**RULE: No proof = BLOCKED.**

---

## Additional Hardening Checks

### Release Gate (10/10)
```bash
# Single command, all P0 checks (no warnings allowed)
npm run release:gate
```

### File Size Validation
```bash
# Check no source files exceed 250 lines
./scripts/check-file-size.sh
```

### Performance Validation
```bash
# Run full performance check suite
./scripts/perf-check.sh
```

### Plan Completion Validation
```bash
# Verify all plans in done/ are truly complete
for f in docs/plans/done/*.md; do
  unchecked=$(grep -c '\[ \]' "$f" 2>/dev/null || echo 0)
  [ "$unchecked" -gt 0 ] && echo "BLOCKED: $f has $unchecked unchecked items"
done
```
