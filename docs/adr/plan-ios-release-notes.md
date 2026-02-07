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
