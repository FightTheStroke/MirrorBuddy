# Release Checklist - MirrorBuddy

Comprehensive checklist for releasing MirrorBuddy with quality gates, i18n validation, and monitoring.

---

## Quick Start

**Command**: `npm run release:gate` (full automated gate)

This runs all automated checks including:

- Pre-release checks (docs, code hygiene, build)
- **i18n completeness validation** (Phase 0.75)
- TypeScript & security audits (Phase 1)
- Unit tests & E2E tests (Phase 3)
- Performance checks (Phase 4)
- Plan sanity (Phase 6)

---

## Phases Overview

| Phase    | Title                     | Automated | Manual |
| -------- | ------------------------- | --------- | ------ |
| 0        | Pre-release checks        | ✓         | -      |
| **0.75** | **i18n verification**     | **✓**     | -      |
| 1        | TypeScript & code quality | ✓         | -      |
| 2        | Build & tests             | ✓         | -      |
| 3        | Performance & file size   | ✓         | -      |
| 4        | Grafana locale metrics    | -         | ✓      |
| 5        | Plan sanity               | ✓         | -      |
| 6        | Full release gate         | ✓         | -      |
| 7        | Create release            | -         | ✓      |
| 8        | Post-release verification | -         | ✓      |

---

## Phase 0 & 0.75: Automated Checks

```bash
npm run release:gate
```

**Includes**:

- Pre-release checks (lint, typecheck, build, perf, file size)
- **i18n completeness check** (`npx tsx scripts/i18n-check.ts`)
- Code quality gates (TypeScript rigor, security audit)
- Unit test + coverage
- E2E test suite
- Plan sanity check

**Expected result**: All tests pass in ~5-10 minutes on M3 Max.

---

## Phase 1: i18n Verification (NEW - F-66)

### Automated Steps (in release-gate)

```bash
npx tsx scripts/i18n-check.ts
```

Validates:

- [x] All 5 locales present: `it`, `en`, `fr`, `de`, `es`
- [x] Italian (it) is reference with all keys
- [x] Other locales have all keys from Italian
- [x] No orphaned extra keys
- [x] Result: PASS (zero missing keys)

### Manual Verification Steps

See: **`docs/operations/RELEASE-I18N-VERIFICATION.md`** for:

- Loading all 5 locales in browser
- Testing language-specific maestri (Molière, Goethe, Cervantes)
- Verifying maestri character consistency
- Testing locale switching and persistence

### Maestri to Test

- **Molière** (French) - "tu" (informal) address, voice: "echo"
- **Goethe** (German) - "Sie" (formal) address, voice: "onyx"
- **Cervantes** (Spanish) - "vos/tú" (informal), voice: "nova"

---

## Phase 4: Grafana Locale Metrics (NEW - F-66)

See: **`docs/operations/RELEASE-GRAFANA-VERIFICATION.md`** for:

- Accessing Grafana locale dashboard
- Verifying all 5 locales have metrics
- Checking active users, sessions, chat messages, voice minutes
- Verifying locale variable dropdown
- Monitoring error rates and response times

---

## Phase 7: Create Release

```bash
npm run version:patch     # Bug fixes + i18n updates
npm run version:minor     # New features, new maestri
npm run version:major     # Breaking changes
```

---

## Phase 8: Post-Release

See: **`docs/operations/RELEASE-POST-RELEASE.md`** for:

- GitHub release verification
- Production deployment check
- Smoke tests (all 5 locales)
- 15-minute Grafana monitoring

---

## Full Checklist Template

Use during release:

- [ ] `npm run release:gate` passes
- [ ] Manual i18n verification (see RELEASE-I18N-VERIFICATION.md)
- [ ] Grafana locale metrics visible (see RELEASE-GRAFANA-VERIFICATION.md)
- [ ] Release created with version bump
- [ ] Post-release verification complete (see RELEASE-POST-RELEASE.md)

---

## Troubleshooting

### i18n Check Fails

- Compare `messages/it.json` (reference) with missing locale
- Add missing keys to other locales
- Rerun: `npx tsx scripts/i18n-check.ts`

### Maestri Not Appearing

- Verify exports in `src/data/maestri/index.ts`
- Run: `npm run test:unit -- character-consistency`
- Clear cache: `rm -rf .next && npm run build`

### Grafana Shows No Metrics

- Verify: `npx tsx scripts/test-grafana-push.ts`
- Check env: `echo $GRAFANA_CLOUD_PROMETHEUS_URL`
- Wait 5 minutes for metrics ingestion

---

## References

- **Detailed i18n steps**: `docs/operations/RELEASE-I18N-VERIFICATION.md`
- **Grafana verification**: `docs/operations/RELEASE-GRAFANA-VERIFICATION.md`
- **Post-release steps**: `docs/operations/RELEASE-POST-RELEASE.md`
- **i18n setup**: `docs/i18n/SETUP.md`
- **Maestri guide**: `docs/maestri/language-maestri.md`
- **Release scripts**: `scripts/release-*.sh`

---

**Version**: 1.0.0 (F-66: Release process includes i18n validation)
**Last updated**: 2026-01-25
