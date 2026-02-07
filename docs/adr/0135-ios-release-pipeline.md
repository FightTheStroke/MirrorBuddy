# ADR 0135: iOS Release Pipeline

## Status

Accepted

## Date

2026-02-07

## Context

MirrorBuddy requires a production-grade iOS release pipeline to distribute the mobile app to users via TestFlight and eventually the App Store. The system must:

1. Automate code signing with centralized certificate management
2. Support two release channels: internal beta and external TestFlight
3. Validate release readiness before building (8 automated checks)
4. Integrate with existing app-release-manager agent workflow
5. Maintain version consistency across web and iOS platforms
6. Prevent credential leakage (all secrets via environment variables)
7. Support CI/CD automation without manual Xcode interaction

The Capacitor-based architecture requires building a Next.js static export, syncing to iOS native project, then compiling with Xcode.

## Decision

Implement Fastlane + Match for iOS releases with the following architecture:

### 1. Fastlane Configuration

Central iOS automation tool (`ios/fastlane/Fastfile`) with two lanes:

#### Lane: beta (Internal TestFlight)

For internal team testing before wider release.

```ruby
lane :beta do
  ensure_git_status_clean
  increment_build_number(xcodeproj: "App/App.xcodeproj")
  sync_code_signing(type: "appstore")
  build_app(workspace: "App/App.xcworkspace", scheme: "App", export_method: "app-store")
  upload_to_testflight(
    distribute_external: false,
    notify_external_testers: false,
    changelog: "Bug fixes and improvements"
  )
  commit_version_bump(message: "Bump iOS build number [skip ci]", force: true)
  add_git_tag(grouping: "ios-beta", build_number: get_build_number)
  push_to_git_remote(tags: true)
end
```

**Key behaviors:**

- Auto-increments build number (CFBundleVersion)
- Does NOT increment version number (CFBundleShortVersionString)
- Skips external distribution and tester notifications
- Tags with `ios-beta/<build>`

#### Lane: release (External TestFlight)

For external testers and pre-production validation.

```ruby
lane :release do
  ensure_git_status_clean
  increment_version_number(xcodeproj: "App/App.xcodeproj", bump_type: "patch")
  increment_build_number(xcodeproj: "App/App.xcodeproj")
  sync_code_signing(type: "appstore")
  build_app(workspace: "App/App.xcworkspace", scheme: "App", export_method: "app-store")
  upload_to_testflight(
    skip_waiting_for_build_processing: false,
    distribute_external: true,
    notify_external_testers: true,
    changelog: "New release ready for testing"
  )
  commit_version_bump(message: "Bump iOS version and build number [skip ci]", force: true)
  add_git_tag(grouping: "ios-release", build_number: get_build_number)
  push_to_git_remote(tags: true)
end
```

**Key behaviors:**

- Auto-increments BOTH version (patch bump) and build number
- Distributes to external testers with notifications
- Waits for App Store Connect processing
- Tags with `ios-release/<build>`

### 2. Fastlane Match (Code Signing)

Centralized certificate and provisioning profile management via private Git repository.

**Configuration:**

- **Bundle ID:** `com.mirror-labs.MirrorBuddy`
- **Match Type:** `appstore` (App Store distribution certificates)
- **Match Repository:** https://github.com/FightTheStroke/private-certificates (private)
- **Read-Only Mode:** `readonly: true` (default for CI safety)
- **Encryption:** Password-encrypted certificates (MATCH_PASSWORD env var)

**Match Workflow:**

1. Developer runs `fastlane match appstore` to generate certificates (one-time setup)
2. Certificates and profiles stored encrypted in match repo
3. CI/CD runs `sync_code_signing(type: "appstore")` before build
4. Match clones repo, decrypts, installs certificates/profiles locally
5. Xcode uses installed profiles to sign app

**Safety Guard:** `readonly: true` prevents CI from accidentally regenerating certificates. Only authorized developers can run `match` in write mode.

### 3. iOS Release Validation

Eight automated checks via `scripts/ios-release-check.sh` before build:

| Check                    | Blocking | Platform   | Purpose                              |
| ------------------------ | -------- | ---------- | ------------------------------------ |
| Mobile Web Build         | Yes      | All        | Next.js static export succeeds       |
| Capacitor Sync           | Yes      | All        | Web assets copied to ios/App         |
| Match Certificates Valid | Yes      | All        | Certificates not expired             |
| Info.plist Version Sync  | Yes      | All        | package.json matches Info.plist      |
| Provisioning Profiles    | No       | macOS only | Profiles installed locally           |
| Xcode CLI Tools          | No       | macOS only | Xcode command line tools available   |
| CocoaPods Installed      | No       | macOS only | CocoaPods available for dependencies |
| iOS Project Compiles     | No       | macOS only | Dry-run build succeeds               |

**Execution:**

```bash
./scripts/ios-release-check.sh
# Exit 0: all blocking checks pass
# Exit 1: any blocking check fails
# JSON output with per-check status
```

**Blocking vs Non-Blocking:**

- **Blocking** (4): Must PASS on all platforms (macOS and Linux CI)
- **Non-Blocking** (4): Skipped on Linux, validated on macOS developer machines

### 4. app-release-manager Integration

The app-release-manager agent (v4.0.0) includes Task O for iOS releases:

**Task O: iOS Release Readiness**

```markdown
PROMPT: "iOS release readiness check.
Reference: ~/.claude/agents/release_management/ios-release-checks.md
Run all 8 checks: mobile web build, capacitor sync, match certificates,
Info.plist version, provisioning profiles, Xcode CLI, CocoaPods, iOS compile.
Return JSON: {status: PASS/FAIL, checks: [{name, status, detail}], summary: string}"
MODEL: sonnet, BACKGROUND: true
```

**Integration Flow:**

1. Developer triggers `/release` with app-release-manager
2. Agent spawns Task O in parallel with other release checks
3. Task O runs `ios-release-check.sh` and parses JSON output
4. All checks must PASS before proceeding to manual Fastlane lane execution
5. Developer manually runs `cd ios && fastlane beta` or `fastlane release`

**Manual Step Required:** Fastlane lanes are NOT automated in CI due to:

- Apple ID authentication requires interactive 2FA
- App Store Connect API keys not yet configured
- Match password must be entered securely (not in CI logs)

### 5. Environment Variables

All credentials via environment variables (NEVER hardcoded):

```env
# Fastlane Match (Code Signing)
MATCH_GIT_URL=https://github.com/FightTheStroke/private-certificates
MATCH_PASSWORD=<encrypted-password>

# Apple Developer
FASTLANE_APPLE_ID=roberdan@microsoft.com
FASTLANE_TEAM_ID=93T3LG4NPG

# App Store Connect (future CI/CD automation)
APP_STORE_CONNECT_API_KEY_ID=<key-id>
APP_STORE_CONNECT_ISSUER_ID=<issuer-id>
APP_STORE_CONNECT_API_KEY_PATH=<path-to-p8-file>
```

**Security Practices:**

- Env vars stored in developer `.zshrc` or `.bashrc` (local)
- CI/CD uses GitHub Secrets or Vercel Environment Variables
- Match repo is private, separate from main codebase
- MATCH_PASSWORD encrypted, rotated quarterly

### 6. Version Management

Version consistency enforced across platforms:

| File                     | Field                        | Source of Truth |
| ------------------------ | ---------------------------- | --------------- |
| `package.json`           | `version`                    | Manual bump     |
| `ios/App/App/Info.plist` | `CFBundleShortVersionString` | Manual sync     |
| `ios/App/App/Info.plist` | `CFBundleVersion`            | Fastlane auto   |

**Workflow:**

1. Developer bumps `package.json` version for new release
2. Manually sync to `Info.plist` (or add pre-release script)
3. Fastlane auto-increments build number (CFBundleVersion)
4. Validation check ensures package.json matches Info.plist

**Future Improvement:** Add npm script to auto-sync versions.

### 7. Release Channels

| Channel             | Lane      | Distribution | Testers    | Use Case               |
| ------------------- | --------- | ------------ | ---------- | ---------------------- |
| Internal TestFlight | `beta`    | Internal     | Team only  | Feature validation     |
| External TestFlight | `release` | External     | Beta users | Pre-production testing |
| App Store           | (future)  | Public       | All users  | Production release     |

**Current Scope:** Internal and external TestFlight only. App Store submission requires additional steps (screenshots, metadata, review).

### 8. Capacitor Integration

The Next.js web app is packaged for iOS via Capacitor:

**Build Flow:**

```bash
# 1. Build Next.js static export for mobile
npm run build:mobile:web
# Output: out/ directory with static HTML/CSS/JS

# 2. Sync web assets to iOS native project
npx cap sync ios
# Copies out/ to ios/App/App/public

# 3. Build iOS app with Xcode (via Fastlane)
cd ios && fastlane beta
# Compiles Swift/Obj-C + embedded web assets
```

**Capacitor Plugins Used:**

- `@capacitor/app` - App lifecycle events
- `@capacitor/splash-screen` - Launch screen
- `@capacitor/status-bar` - Status bar styling
- `@capacitor/keyboard` - Keyboard behavior

## Consequences

### Positive

1. **Automated Code Signing:** Match eliminates "signing hell" across team members
2. **Reproducible Builds:** Fastlane lanes ensure consistent build process
3. **Version Safety:** 8 validation checks prevent broken builds
4. **Agent Integration:** app-release-manager Task O provides parallel validation
5. **Separation of Concerns:** Match repo isolates sensitive certificates
6. **Multi-Channel Support:** Internal beta for fast iteration, external for wider testing
7. **Git Integration:** Auto-commit version bumps, auto-tag releases

### Negative

1. **Manual Execution:** Fastlane lanes not yet automated in CI (requires 2FA setup)
2. **macOS Dependency:** Full validation requires macOS for Xcode/CocoaPods checks
3. **Match Setup Overhead:** Initial setup requires generating certificates
4. **Version Sync Manual:** package.json and Info.plist must be synced manually
5. **Apple Ecosystem Lock-In:** Relies on TestFlight, App Store Connect

### Mitigations

1. **CI Automation:** Future work to use App Store Connect API keys for headless auth
2. **Linux CI:** Blocking checks (4/8) run on Linux, non-blocking validated locally
3. **Match Recovery:** `fastlane match_nuke` available to regenerate certificates
4. **Version Script:** Add npm script to auto-sync versions before build
5. **Documentation:** Comprehensive ADR and ios-release-checks.md module

## Files

### Fastlane Configuration

- `ios/fastlane/Fastfile` - Fastlane lanes (beta, release)
- `ios/fastlane/Matchfile` - Match configuration (bundle ID, repo URL)
- `ios/fastlane/Appfile` - Apple ID, Team ID

### Validation

- `scripts/ios-release-check.sh` - 8 automated checks with JSON output
- `~/.claude/agents/release_management/ios-release-checks.md` - Check module

### Agent Integration

- `~/.claude/agents/release_management/app-release-manager.md` - Release agent (v4.0.0)
- Task O: iOS Release Readiness (parallel validation)

### iOS Native Project

- `ios/App/App.xcworkspace` - Xcode workspace
- `ios/App/App.xcodeproj` - Xcode project
- `ios/App/App/Info.plist` - App metadata (bundle ID, version, build)
- `ios/App/Podfile` - CocoaPods dependencies

### Documentation

- `docs/adr/0135-ios-release-pipeline.md` - This ADR

## Related

- ADR 0028: PostgreSQL + pgvector Migration - Data backend for mobile app
- ADR 0052: Vercel Deployment Configuration - Web deployment
- ADR 0099: Vercel Deployment Checks Gate - Release validation pattern
- Plan 135: iOS Release Pipeline - Implementation plan

## Environment Variables

```env
# Required for Fastlane Match
MATCH_GIT_URL=https://github.com/FightTheStroke/private-certificates
MATCH_PASSWORD=<encrypted-password>

# Required for Apple Developer
FASTLANE_APPLE_ID=roberdan@microsoft.com
FASTLANE_TEAM_ID=93T3LG4NPG

# Optional (future CI/CD automation)
APP_STORE_CONNECT_API_KEY_ID=<key-id>
APP_STORE_CONNECT_ISSUER_ID=<issuer-id>
APP_STORE_CONNECT_API_KEY_PATH=<path-to-p8-file>
```

## Future Work

1. **CI/CD Automation:** Use App Store Connect API keys for headless Fastlane execution
2. **Version Sync Script:** Auto-sync package.json version to Info.plist
3. **Screenshot Automation:** Use Fastlane snapshot for App Store screenshots
4. **Metadata Localization:** Add Fastlane deliver for multi-language App Store metadata
5. **App Store Submission:** Extend `release` lane to submit for review
6. **Crash Reporting:** Integrate Sentry iOS SDK for production crash monitoring
