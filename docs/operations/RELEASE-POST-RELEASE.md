# Post-Release Verification - MirrorBuddy

Verification steps after creating a release and deploying to production.

---

## Phase 8: Create Release

Only proceed after release gate passes.

```bash
npm run version:patch     # Bug fixes, i18n updates
npm run version:minor     # New features, new maestri
npm run version:major     # Breaking changes
```

This will:

1. Bump version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Push to GitHub

---

## Phase 9: Post-Release Verification

### 9.1 Verify GitHub Release

1. Go to: https://github.com/{repo}/releases
2. Confirm new release published
   - [ ] Release appears with new version number
   - [ ] Version matches `package.json`
   - [ ] Release notes populated from CHANGELOG.md
   - [ ] Git tag created and accessible

### 9.2 Verify Production Deployment

1. Check Vercel: https://vercel.com/{team}/mirrorbuddy
   - [ ] New deployment started automatically
   - [ ] Build succeeds (green checkmark)
   - [ ] All checks pass (lint, tests, build)

2. Wait for deployment to complete
   - [ ] Takes ~3-5 minutes typically
   - [ ] Final status: "Ready" or "Live"

3. Visit production URL
   - [ ] Landing page loads: https://mirrorbuddy.example.com
   - [ ] No 500 errors
   - [ ] CSS/JS loads correctly

### 9.3 Smoke Tests (All Locales)

**Test each locale in production**:

#### Italian (it)

1. Set locale to Italiano
2. [ ] Home page displays in Italian
3. [ ] Sign-in works
4. [ ] Can access dashboard
5. [ ] Maestri list shows (with Italian subjects)

#### English (en)

1. Set locale to English
2. [ ] Home page displays in English
3. [ ] Sign-in works
4. [ ] Can access dashboard
5. [ ] Maestri list shows (with English subjects)

#### French (fr)

1. Set locale to Français
2. [ ] Home page displays in French
3. [ ] Molière appears in maestri list
4. [ ] Can start conversation with Molière
5. [ ] Greeting is in French (uses "tu")

#### German (de)

1. Set locale to Deutsch
2. [ ] Home page displays in German
3. [ ] Goethe appears in maestri list
4. [ ] Can start conversation with Goethe
5. [ ] Greeting is in German (uses "Sie")

#### Spanish (es)

1. Set locale to Español
2. [ ] Home page displays in Spanish
3. [ ] Cervantes appears in maestri list
4. [ ] Can start conversation with Cervantes
5. [ ] Greeting is in Spanish (informal)

### 9.4 Locale Switching Test

1. Start in Italian
   - [ ] UI in Italian
2. Switch to English
   - [ ] UI immediately updates to English
3. Refresh page
   - [ ] Still in English (persistence)
4. Switch to French
   - [ ] UI in French with accents/special characters correct
5. Open browser DevTools console
   - [ ] Zero errors during any locale switch

### 9.5 Monitor Grafana (15 minutes)

Go to: https://mirrorbuddy.grafana.net/

Monitor for next 15 minutes after deployment:

**Check every 2 minutes**:

- [ ] No error spikes in error rate
- [ ] Response times stable (not degraded)
- [ ] All 5 locales showing traffic
- [ ] No new incidents in alert dashboard

**Expected behavior**:

- Traffic increases as users access post-release
- Error rate stays < 0.5%
- Response times stay < 1500ms (may spike slightly)
- All locales represented in metrics

**If issues detected**:

1. Check app logs in Vercel deployment
2. Review monitoring alerts
3. Contact on-call DevOps
4. Consider rollback if critical issue

---

## Verification Checklist

- [ ] GitHub release created with correct version
- [ ] Vercel deployment completed successfully
- [ ] Production URL accessible (no 500 errors)
- [ ] All 5 locales display correctly
- [ ] Locale switching works and persists
- [ ] Language-specific maestri accessible (Molière, Goethe, Cervantes)
- [ ] Console clean (no errors during testing)
- [ ] Grafana monitoring shows expected metrics
- [ ] Error rate < 0.5% across all locales
- [ ] No critical alerts in monitoring dashboard

---

## Rollback Procedure

If critical issues detected:

1. Go to: https://vercel.com/{team}/mirrorbuddy
2. Select previous deployment (before current)
3. Click "Promote to Production"
4. Confirm rollback
5. Wait 2-3 minutes for reverting to previous version
6. Re-test critical flows
7. File incident report with root cause

---

**Version**: 1.0.0 (2026-01-25)
