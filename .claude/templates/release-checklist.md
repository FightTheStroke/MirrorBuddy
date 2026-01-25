# Release Checklist - MirrorBuddy

Reference checklist for `/release` validation. **Non è un piano da eseguire** - è solo una checklist di riferimento. L'`app-release-manager` esegue tutto automaticamente.

---

## Pre-Release Checks (automatici via app-release-manager)

### Build & Compile

- [ ] `npm run lint` - zero errors/warnings
- [ ] `npm run typecheck` - zero errors
- [ ] `npm run build` - production build passes

### Tests

- [ ] `npm run test:unit` - all pass (target: 6700+)
- [ ] E2E tests CI-compatible pass

### Security

- [ ] No hardcoded secrets
- [ ] `npm audit` - no high/critical vulnerabilities
- [ ] No .env files in git

### Code Quality

- [ ] No TODO/FIXME in critical areas (safety, privacy, security)
- [ ] No console.log in production code
- [ ] No @ts-ignore without justification

### Documentation

- [ ] README badges accurate (test count, coverage)
- [ ] CHANGELOG updated for user-facing changes

---

## Validation Commands

```bash
# Quick validation
npm run pre-push              # ~45-70s

# Full release gate
/release                      # Runs app-release-manager
```

---

## Post-Release

```bash
# Verify CI
gh run list --limit 1

# Verify Vercel
gh api repos/FightTheStroke/MirrorBuddy/deployments --jq '.[0]'

# Tag release (if major/minor)
git tag -a v0.X.0 -m "Release v0.X.0"
git push origin v0.X.0
```

---

## Storico Release

| Version | Date       | Commit  | Notes                         |
| ------- | ---------- | ------- | ----------------------------- |
| 0.10.0  | 2026-01-25 | a380fc6 | Test fixes, a11y improvements |
