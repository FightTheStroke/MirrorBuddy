## Plan Reference

<!-- REQUIRED: Link to the approved execution plan -->
**Execution Plan:** <!-- e.g., docs/plans/PLAN-feature-name.md or issue #123 -->

**Plan Approval:** <!-- Date and who approved, or link to approval comment -->

---

## Summary

<!-- Brief description of what this PR accomplishes (2-3 sentences max) -->

---

## Changes Made (Explicit List)

<!-- List EVERY change in this PR. Each item must correspond to the execution plan. -->

- [ ] Change 1: <!-- description -->
- [ ] Change 2: <!-- description -->
- [ ] Change 3: <!-- description -->

---

## Changes NOT Made (Explicit List)

<!-- List anything you considered but intentionally did NOT do, and why -->

- Did not change X because: <!-- reason -->
- Did not refactor Y because: <!-- reason -->

---

## Verification Evidence

<!-- REQUIRED: Provide evidence that all checks pass -->

### Local Verification

```bash
# Paste output or confirm each passed
npm run lint        # [ ] Passed
npm run typecheck   # [ ] Passed
npm run build       # [ ] Passed
npm run test        # [ ] Passed (if applicable)
```

### CI Pipeline

- [ ] CI pipeline passes: <!-- link to CI run -->

---

## Workaround Declaration

<!-- REQUIRED: Explicitly declare workaround status -->

- [ ] **This PR contains NO workarounds, bypasses, or temporary fixes**
- [ ] This PR contains workarounds (MUST list each below with justification):

| Workaround | Location | Justification | Removal Plan |
|------------|----------|---------------|--------------|
| <!-- e.g., @ts-ignore --> | <!-- file:line --> | <!-- why needed --> | <!-- when/how to remove --> |

---

## Copilot / AI Assistance Declaration

<!-- REQUIRED: Declare AI assistance usage -->

- [ ] No AI assistance was used in this PR
- [ ] AI assistance was used (Copilot, Claude, etc.):
  - [ ] All AI suggestions were individually reviewed
  - [ ] AI suggestions do not introduce scope creep
  - [ ] AI-generated code meets project standards

---

## Checklist Compliance

<!-- REQUIRED: Confirm checklist completion -->

- [ ] I have completed the [Execution Checklist](../docs/EXECUTION-CHECKLIST.md)
- [ ] Every item in the checklist is truthfully checked
- [ ] I understand this PR will be rejected if the checklist is incomplete

---

## Author Declaration

<!-- REQUIRED: Sign off on this PR -->

- [ ] Every change in this PR is explicitly listed above
- [ ] Every change corresponds to the approved execution plan
- [ ] No changes were made outside the approved scope
- [ ] I take personal responsibility for the accuracy of this submission

---

## For Reviewers

Before approving, verify:

1. [ ] Execution plan exists and was approved before implementation
2. [ ] Every change in the diff matches the "Changes Made" list
3. [ ] No changes exist that are not in the execution plan
4. [ ] CI pipeline passes
5. [ ] No prohibited patterns (see EXECUTION-CHECKLIST.md)

**A PR without a completed checklist is automatically invalid.**
