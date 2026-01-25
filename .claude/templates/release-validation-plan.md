# Template: Release Validation Plan

**Uso**: Copiare questo template per ogni nuova release.

```bash
# Creare nuovo piano release
~/.claude/scripts/plan-db.sh create mirrorbuddy "Release-Validation-{VERSION}"
```

---

## Piano: Release-Validation-{VERSION}

**Project**: mirrorbuddy | **Status**: draft

## USER REQUEST (standard)

> Validazione completa per release MirrorBuddy v{VERSION}:
>
> 1. Tutti i test devono passare (E2E + unit)
> 2. Aggiornare documentazione e badges README
> 3. Zero errori/warnings ovunque
> 4. Coerenza totale del codebase

## FUNCTIONAL REQUIREMENTS

| ID   | Requirement                         | Wave | Verified |
| ---- | ----------------------------------- | ---- | -------- |
| F-01 | All unit tests pass (0 failures)    | W1   | [ ]      |
| F-02 | All E2E tests CI-compatible pass    | W1   | [ ]      |
| F-03 | README badges reflect actual values | W2   | [ ]      |
| F-04 | Zero lint errors/warnings           | W3   | [ ]      |
| F-05 | Zero TypeScript errors              | W3   | [ ]      |
| F-06 | Build passes without errors         | W3   | [ ]      |
| F-07 | pre-push validation passes          | W3   | [ ]      |
| F-08 | app-release-manager approves        | W3   | [ ]      |
| F-09 | CI pipeline all green               | W3   | [ ]      |
| F-10 | Vercel deployment success           | W3   | [ ]      |

---

## WAVES

```
W1-TestFixes → W2-Documentation → W3-Validation
```

---

## W1: Test Fixes

| Task ID | Description                   | F-xx | Priority |
| ------- | ----------------------------- | ---- | -------- |
| T1-01   | Fix any failing unit tests    | F-01 | P0       |
| T1-02   | Verify all unit tests pass    | F-01 | P0       |
| T1-03   | Run E2E tests (CI-compatible) | F-02 | P0       |

### Comandi

```bash
npm run test:unit                    # Deve essere 100% pass
npm run test                         # E2E (richiede dev server)
```

---

## W2: Documentation Updates

| Task ID | Description                    | F-xx | Priority |
| ------- | ------------------------------ | ---- | -------- |
| T2-01   | Update README test badge count | F-03 | P1       |
| T2-02   | Verify all badges accurate     | F-03 | P1       |
| T2-03   | Update CHANGELOG.md            | F-03 | P1       |

### Badge Locations (README.md)

| Badge    | Line | Current | Action |
| -------- | ---- | ------- | ------ |
| tests    | 14   | {OLD}   | UPDATE |
| e2e      | 15   | {OLD}   | VERIFY |
| coverage | 16   | 80%     | VERIFY |

---

## W3: Final Validation

| Task ID | Description               | F-xx                | Priority |
| ------- | ------------------------- | ------------------- | -------- |
| T3-01   | Run `npm run pre-push`    | F-04,F-05,F-06,F-07 | P0       |
| T3-02   | Run `app-release-manager` | F-08                | P0       |
| T3-03   | Push and verify CI green  | F-09                | P0       |
| T3-04   | Verify Vercel deployment  | F-10                | P0       |

### Comandi

```bash
npm run pre-push                     # ~45-70s, deve passare

# App Release Manager (subagent)
Task(subagent_type='app-release-manager', prompt='...')

# Push e verifica
git push origin main
gh run list --limit 1                # CI status
gh api repos/.../deployments         # Vercel status
```

---

## QUICK EXECUTION (per Claude)

```bash
# 1. Crea piano
PLAN_ID=$(~/.claude/scripts/plan-db.sh create mirrorbuddy "Release-Validation-{VERSION}")

# 2. Aggiungi waves
W1=$(~/.claude/scripts/plan-db.sh add-wave $PLAN_ID "W1-TestFixes" "Fix and verify tests")
W2=$(~/.claude/scripts/plan-db.sh add-wave $PLAN_ID "W2-Documentation" "Update docs and badges")
W3=$(~/.claude/scripts/plan-db.sh add-wave $PLAN_ID "W3-Validation" "Final validation")

# 3. Aggiungi tasks
~/.claude/scripts/plan-db.sh add-task $W1 T1-01 "Fix failing unit tests" P0 fix
~/.claude/scripts/plan-db.sh add-task $W1 T1-02 "Verify all unit tests pass" P0 test
~/.claude/scripts/plan-db.sh add-task $W1 T1-03 "Run E2E tests CI-compatible" P0 test
~/.claude/scripts/plan-db.sh add-task $W2 T2-01 "Update README test badge" P1 docs
~/.claude/scripts/plan-db.sh add-task $W2 T2-02 "Verify all badges accurate" P1 docs
~/.claude/scripts/plan-db.sh add-task $W2 T2-03 "Update CHANGELOG.md" P1 docs
~/.claude/scripts/plan-db.sh add-task $W3 T3-01 "Run pre-push validation" P0 validation
~/.claude/scripts/plan-db.sh add-task $W3 T3-02 "Run app-release-manager" P0 validation
~/.claude/scripts/plan-db.sh add-task $W3 T3-03 "Push and verify CI green" P0 validation
~/.claude/scripts/plan-db.sh add-task $W3 T3-04 "Verify Vercel deployment" P0 validation

# 4. Start
~/.claude/scripts/plan-db.sh start $PLAN_ID
```

---

## CHECKLIST PRE-RELEASE

- [ ] Tutti i test unit passano
- [ ] Tutti i test E2E CI passano
- [ ] Badge README aggiornati
- [ ] CHANGELOG aggiornato
- [ ] Zero lint warnings
- [ ] Zero TypeScript errors
- [ ] Build passa
- [ ] pre-push passa
- [ ] app-release-manager approva
- [ ] CI pipeline verde
- [ ] Vercel deployment ok

---

## STORICO RELEASE

| Version | Plan ID | Date       | Notes                   |
| ------- | ------- | ---------- | ----------------------- |
| 0.10.0  | 76      | 2026-01-25 | First templated release |
