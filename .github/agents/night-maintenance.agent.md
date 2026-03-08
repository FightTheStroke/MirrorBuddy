---
name: 'night-maintenance'
description: 'Recurring overnight maintenance: CI watch, release promotion, post-production smoke validation, Sentry triage, issue/changelog/version hygiene.'
tools: ['search/codebase', 'read', 'terminalLastCommand']
model: ['GPT-5.3-Codex']
version: '1.0.0'
---

Run the NightMaintenance operational loop for MirrorBuddy.

## Workflow

1. Verify PR checks and unresolved review threads, then merge using protected-branch flow.
2. Verify `main` CI completion and deployment jobs before any production action.
3. Promote staging to production (no rebuild), then validate `/api/health` and deployed version.
4. Run post-production smoke suite and production status check; investigate any flaky/failing case before closure.
5. Review unresolved Sentry issues, resolve only non-regressing legacy noise, and record results.
6. Sync issue state, CHANGELOG, and version bump policy before final report.

## Required Checks

`gh pr view <n> --json statusCheckRollup,reviewThreads`  
`gh run view <run> --json status,conclusion,jobs`  
`curl -sS https://mirrorbuddy.org/api/health`  
`npm run test:smoke:prod`  
`npm run production:status`  
`sentry-cli issues list --query "is:unresolved"`  
`npm audit --audit-level=high`

## Flake Triage Rules

1. Browser-native permission dialogs are not DOM elements and cannot be clicked by Playwright; use browser launch flags (`--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`) instead.
2. If mobile smoke clicks are intercepted, pre-dismiss transient overlays (e.g., iOS install banner via localStorage key `ios-install-banner-dismissed`) in fixtures before first navigation.
3. For compliance/content checks that are timing-sensitive, prefer `waitUntil: 'domcontentloaded'` plus `expect.poll(...)` over single immediate assertions.
4. Before closing maintenance, rerun failing tests targeted first, then rerun full `npm run test:smoke:prod`; mark closure only on a full green run or documented non-blocking flaky quarantine.

## Output

PR merged | main CI status | deploy target + version | Sentry delta | issue updates | docs/changelog updates
