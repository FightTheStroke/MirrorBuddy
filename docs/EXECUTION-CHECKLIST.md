# Execution Compliance Checklist

**MANDATORY** before opening or approving any Pull Request.

This checklist ensures strict adherence to approved execution plans and prevents scope creep, workarounds, or hidden decisions.

---

## Pre-PR Checklist (Author)

### 1. Plan Compliance

- [ ] An execution plan was created and approved BEFORE implementation
- [ ] Every change in this PR corresponds to a task in the approved plan
- [ ] No tasks from the approved plan were skipped or deferred
- [ ] No additional tasks were added without explicit plan amendment

### 2. Scope Control

- [ ] This PR contains ONLY changes specified in the approved plan
- [ ] No "while I'm here" improvements or refactors
- [ ] No unrelated bug fixes bundled in
- [ ] No speculative changes for "future needs"
- [ ] No changes to files not mentioned in the plan

### 3. Workaround Prohibition

- [ ] No `// @ts-ignore` or `// @ts-expect-error` without documented justification
- [ ] No `eslint-disable` without documented justification
- [ ] No `SKIP_TYPE_CHECK`, `SKIP_LINT`, or similar bypass flags
- [ ] No stub-only type definitions that mask real type errors
- [ ] No `any` types introduced without documented justification
- [ ] No `TODO`, `HACK`, `FIXME`, or `WORKAROUND` markers added
- [ ] No empty catch blocks that swallow errors
- [ ] No hardcoded values that should be configurable

### 4. Verification Evidence

All verification commands must pass. Provide evidence (screenshot, log, or CI link).

- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run build` completes successfully
- [ ] `npm run test` passes (if applicable to changed areas)
- [ ] CI pipeline passes (link provided in PR)

### 5. Copilot / Review Comments

- [ ] All AI-generated suggestions were reviewed for correctness
- [ ] Copilot suggestions do not introduce scope creep
- [ ] Review comments from previous PRs (if any) were addressed
- [ ] No "accept all suggestions" without individual review

### 6. Declaration of Responsibility

- [ ] I confirm that every item above is truthfully checked
- [ ] I understand that unchecked items invalidate this PR
- [ ] I take personal responsibility for the accuracy of this checklist

**Author Signature:** _________________________ **Date:** _____________

---

## Review Checklist (Reviewer)

### 1. Plan Verification

- [ ] I have read the referenced execution plan
- [ ] Every change in the diff matches the plan
- [ ] No changes exist that are not in the plan
- [ ] The plan was approved before implementation began

### 2. Code Quality

- [ ] Changes follow project coding standards
- [ ] No workarounds or bypass patterns detected
- [ ] No scope creep or unrelated changes
- [ ] Error handling is appropriate (no swallowed errors)

### 3. Verification Confirmation

- [ ] CI pipeline shows green status
- [ ] Author provided verification evidence
- [ ] Test coverage is adequate for changes

### 4. Final Decision

- [ ] **APPROVE**: All criteria met, PR follows approved plan exactly
- [ ] **REQUEST CHANGES**: Issues identified (specify below)
- [ ] **REJECT**: Plan violation or unauthorized changes detected

**Reviewer Signature:** _________________________ **Date:** _____________

---

## Rejection Criteria

A PR **MUST be rejected** if any of the following apply:

1. No execution plan exists or was not approved
2. Changes exist that are not in the approved plan
3. Workaround patterns are present without justification
4. Verification commands fail
5. Checklist items are unchecked without explanation
6. Author cannot explain why a change was made

---

## Amendment Process

If changes are needed beyond the approved plan:

1. **STOP** implementation immediately
2. Document the required change and rationale
3. Update the execution plan with the new scope
4. Get explicit approval for the amended plan
5. Resume implementation only after approval

**There are no exceptions to this process.**

---

## Quick Reference: Prohibited Patterns

```typescript
// PROHIBITED - These patterns indicate workarounds

// @ts-ignore
// @ts-expect-error
/* eslint-disable */
any // without justification
as unknown as SomeType // type assertion chains
// TODO: fix later
// HACK:
// WORKAROUND:
// FIXME:
catch (e) { } // empty catch
SKIP_TYPE_CHECK=true
SKIP_LINT=true
```

---

*Last updated: 2026-01-03*
*This checklist is mandatory per project governance.*
