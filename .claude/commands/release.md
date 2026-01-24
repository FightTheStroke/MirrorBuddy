# Release Manager - MirrorBuddy

Pre-release validation for MirrorBuddy via `app-release-manager` subagent.

## Context (pre-computed)

```
Project: MirrorBuddy
Branch: `git branch --show-current 2>/dev/null || echo "not a git repo"`
Uncommitted: `git status --short 2>/dev/null | wc -l | tr -d ' '` files
Version: `node -p "require('./package.json').version" 2>/dev/null || echo "unknown"`
```

## Activation

When message contains `/release` or `/release {version}`.

## What It Does

Launches `app-release-manager` subagent with MirrorBuddy-specific validations:

1. **Educational Content Quality** - AI tutors, knowledge bases, teaching prompts
2. **Student Safety** - Content filtering, bias detection, safety guardrails
3. **GDPR Compliance** - Data handling, privacy, consent mechanisms
4. **Accessibility (WCAG 2.1 AA)** - 7 DSA profiles, contrast, keyboard nav
5. **ISE Engineering Fundamentals** - Code quality, testing, documentation
6. **AI Tutor Readiness** - All 22 maestri verified, tools working

## Workflow

### Phase 1: Launch Agent

```typescript
await Task({
  subagent_type: "app-release-manager",
  description: "MirrorBuddy release validation",
  prompt: `
RELEASE VALIDATION FOR MIRRORBUDDY

Project: MirrorBuddy
Target Version: ${version || "auto-detect from package.json"}
Branch: ${branch}

Execute full release gate:
1. Pre-flight checks (git clean, correct branch)
2. Build validation (lint, typecheck, build)
3. Test execution (unit, E2E)
4. Security audit (secrets, dependencies)
5. Accessibility audit (WCAG 2.1 AA)
6. Compliance check (GDPR, EU AI Act)
7. AI tutor verification (all 22 maestri)
8. Documentation review (CHANGELOG, ADRs)

Zero tolerance policy:
- ANY test failure = BLOCK
- ANY security issue = BLOCK
- ANY a11y violation = BLOCK
- ANY compliance gap = BLOCK

Output: Release report with APPROVE or BLOCK decision.
`,
});
```

### Phase 2: Review Results

Agent returns comprehensive report with MirrorBuddy-specific checks.

### Phase 3: User Decision

If APPROVED → version bump, git tag, CHANGELOG, GitHub release
If BLOCKED → fix issues, re-run `/release`

## MirrorBuddy-Specific Checks

| Check   | Validation                                |
| ------- | ----------------------------------------- |
| Maestri | All 22 load correctly, knowledge embedded |
| Coaches | 6 coaches with valid prompts              |
| Buddies | 6 buddies with age-adaptive prompts       |
| Tools   | All 16 learning tools functional          |
| Tiers   | Trial/Base/Pro limits enforced            |
| Safety  | Bias detector, content filter active      |
| A11y    | 7 DSA profiles, instant access button     |

## Zero Tolerance Policy (Blocking)

- ❌ ANY compiler/lint warning
- ❌ ANY test failure
- ❌ ANY security vulnerability
- ❌ ANY TODO/FIXME in code
- ❌ ANY hardcoded secrets
- ❌ ANY debug prints (console.log)
- ❌ ANY outdated deps with CVEs
- ❌ ANY a11y violation (WCAG 2.1 AA)
- ❌ ANY GDPR/EU AI Act compliance gap

## Quick Reference

```bash
# Full release validation
/release

# Validate specific version
/release 1.5.0

# Run release gate script directly
npm run release:gate
```

## Related

- Agent: `app-release-manager`
- Hardening: `mirrorbuddy-hardening-checks`
- Thor: `thor-quality-assurance-guardian`
- Gate script: `npm run release:gate`
