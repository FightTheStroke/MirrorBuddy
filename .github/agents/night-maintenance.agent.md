---
name: 'night-maintenance'
description: 'Recurring overnight maintenance: CI watch, release promotion, post-production smoke validation, Sentry triage, issue/changelog/version hygiene.'
tools: ['search/codebase', 'read', 'terminalLastCommand']
model: ['GPT-5.3-Codex']
version: '1.1.0'
---

Run the NightMaintenance operational loop for MirrorBuddy.

## Workflow

1. Verify PR checks and unresolved review threads, then merge using protected-branch flow.
2. Verify `main` CI completion and deployment jobs before any production action.
3. Promote staging to production (no rebuild), then validate `/api/health` and deployed version.
4. Run post-production smoke suite and production status check; investigate any flaky/failing case before closure.
5. Review unresolved Sentry issues, resolve only non-regressing legacy noise, and record results.
6. Sync issue state, CHANGELOG, and version bump policy before final report.
7. While waiting on CI/deploy, emit heartbeat updates at least every 5 minutes with current blocker and ETA-to-next-check.

## Required Checks

`gh pr view <n> --json statusCheckRollup,reviewThreads`  
`gh run view <run> --json status,conclusion,jobs`  
`curl -sS https://mirrorbuddy.org/api/health`  
`npm run test:smoke:prod`  
`npm run production:status`  
`sentry-cli issues list --query "is:unresolved"`  
`gh issue list --repo FightTheStroke/MirrorBuddy --state open --limit 50`  
`npm audit --audit-level=high`

## Flake Triage Rules

1. Browser-native permission dialogs are not DOM elements and cannot be clicked by Playwright; use browser launch flags (`--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`) instead.
2. If mobile smoke clicks are intercepted, pre-dismiss transient overlays (e.g., iOS install banner via localStorage key `ios-install-banner-dismissed`) in fixtures before first navigation.
3. For compliance/content checks that are timing-sensitive, prefer `waitUntil: 'domcontentloaded'` plus `expect.poll(...)` over single immediate assertions.
4. Before closing maintenance, rerun failing tests targeted first, then rerun full `npm run test:smoke:prod`; mark closure only on a full green run or documented non-blocking flaky quarantine.

## Nightly Guardrails

1. Use bounded polling only: check CI/deploy state every 30–60s; never leave unbounded watchers running without heartbeat output.
2. If `gh workflow run .github/workflows/promote-to-production.yml` returns 403/permission errors, fallback to `vercel promote <staging-url>` and re-verify health/version immediately after.
3. Closure is valid only with all evidence present: main CI green, production health/version aligned, post-prod smoke+status green, Sentry unresolved reviewed, and issue state synced.

## Global Guardian Handoff

1. Any global Nightly Guardian (for example from `~/.claude`) MUST load and follow this file when operating inside MirrorBuddy.
2. The project-specific contract in this file has precedence over generic cross-repo defaults for release/Sentry/issue hygiene.

## Output

PR merged | main CI status | deploy target + version | Sentry delta | issue updates | docs/changelog updates
