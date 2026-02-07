# Plan 135 - iOS Release Pipeline - Running Notes

## W1-Foundation

### Completed Tasks

- **T1-01**: Created `docs/claude/ios-release.md` (204 lines) - comprehensive iOS release guide
- **T1-02**: Created `ios/fastlane/Matchfile` with readonly mode, env var references
- **T1-03**: Verified iOS env vars already present in `.env.example` (commit 7e17e12b)

### Decisions

- Matchfile uses `readonly(true)` by default to prevent accidental certificate regeneration in CI
- All credentials sourced from ENV vars (no hardcoded values)
- Documentation follows existing `docs/claude/` style: table-heavy, concise quick reference

### Observations

- `.env.example` iOS section was already added in prior commit, T1-03 was a verification-only task
- Existing Fastfile already references match provisioning profiles but lacks `sync_code_signing` call (addressed in W3)

## W2-ReleaseManager

### Completed Tasks

- **T2-01**: Created `~/.claude/agents/release_management/ios-release-checks.md` (151 lines) - 8 automated iOS release checks
- **T2-02**: Updated `app-release-manager.md` to v4.0.0 (146 lines) - Phase 0 iOS detection, Task O
- **T2-03**: Updated `app-release-manager-execution.md` to v4.0.0 (149 lines) - iOS report template, version bump logic

### Decisions

- Task O uses sonnet model (not haiku) since iOS checks require more nuanced analysis
- iOS detection in Phase 0 uses AskUserQuestion to let user opt-in/out
- All 3 agent files kept well under 250-line limit (146-151 lines each)

### Observations

- Agent files live in `~/.claude/agents/` (outside repo), so they won't appear in git status
- Original app-release-manager.md was 266 lines (over limit); trimmed to 146 by condensing descriptions

## W3-Automation

### Completed Tasks

- **T3-01**: Created `scripts/ios-release-check.sh` (197 lines) - 8 automated checks with JSON output, Linux-safe skip for macOS-only checks (5-8)
- **T3-02**: Updated `ios/fastlane/Fastfile` - added `sync_code_signing` in beta/release lanes, added `match_nuke` lane
- **T3-03**: Added `ios:check` npm script to `package.json` pointing to `scripts/ios-release-check.sh`

### Decisions

- Checks 1-4 are blocking (run on all platforms): mobile web build, cap sync, match env vars, Info.plist version
- Checks 5-8 are macOS-only: provisioning profiles, Xcode CLI, CocoaPods, iOS compile — SKIP on Linux
- JSON output format for machine-readable CI integration: `{timestamp, checks[], summary, result}`
- Exit 0 on all blocking pass, exit 1 on any blocking fail (skip does not fail)

### Observations

- `sync_code_signing(type: "appstore")` placed before `build_app` ensures profiles are always fresh
- `match_nuke` lane allows emergency certificate reset without manual Apple Developer Portal access
- Script uses `set -euo pipefail` per coding standards, with `trap cleanup EXIT`

## WF-Documentation

### Completed Tasks

- **TF-01**: Created `docs/adr/0135-ios-release-pipeline.md` (247 lines) - ADR documenting Fastlane+Match, TestFlight, agent integration
- **TF-02**: Updated `CLAUDE.md` with `ios-release` docs reference and `ios:check` command
- **TF-03**: Reorganized `CHANGELOG.md` with cohesive "iOS Release Pipeline" section

### Decisions

- ADR 0135 covers architecture, env vars, distribution channels, and agent integration in one document
- CHANGELOG consolidated 8 individual entries into 4 logical sub-groups (Documentation, Configuration, Automation, Agent Integration)

### Observations

- P2 review comment from Codex resolved: `check_match_certificates()` enhanced with keychain identity validation on macOS
- CI failures (Unit Tests, Smoke Tests) pre-existing on main (parse5/jsdom standalone), not introduced by this plan
