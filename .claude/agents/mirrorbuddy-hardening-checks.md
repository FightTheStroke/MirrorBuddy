---
name: mirrorbuddy-hardening-checks
description: Production hardening validation for MirrorBuddy releases. Used by app-release-manager.
tools: ["Read", "Grep", "Glob", "Bash", "Task"]
model: opus-4.5
---

# Hardening Checks - Post-Mortem Learnings

## FALSE COMPLETION PATTERN

Plans in `done/` with `[ ]` unchecked = FALSE DONE.

```bash
for f in docs/plans/done/*.md; do
  [[ -f "$f" ]] && grep -c '\[ \]' "$f" 2>/dev/null | grep -v "^0$" && echo "BLOCKED: $f"
done
```

## SMOKE TEST DECEPTION

**Bad test**: Click, wait, no assertion
**Good test**: Click, assert visible, assert count

## PROOF STANDARD

| Counts      | Doesn't Count  |
| ----------- | -------------- |
| Test output | "Tests pass"   |
| Screenshot  | "I fixed it"   |
| grep result | "✅ COMPLETED" |

**RULE: No proof = BLOCKED.**
