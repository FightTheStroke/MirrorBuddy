# iOS Release

> Complete iOS release pipeline with Fastlane, TestFlight, and Capacitor integration

## Quick Reference

| Key        | Value                                                    |
| ---------- | -------------------------------------------------------- |
| Bundle ID  | `com.mirror-labs.MirrorBuddy`                            |
| Apple ID   | `roberdan@microsoft.com`                                 |
| Team ID    | `93T3LG4NPG`                                             |
| Workspace  | `ios/App/App.xcworkspace`                                |
| Project    | `ios/App/App.xcodeproj`                                  |
| Match Repo | `https://github.com/FightTheStroke/private-certificates` |
| Config     | `ios/fastlane/Fastfile`, `ios/fastlane/Matchfile`        |

## Prerequisites

| Requirement       | Version | Install                              |
| ----------------- | ------- | ------------------------------------ |
| macOS             | 13+     | Required platform                    |
| Xcode             | 15+     | App Store → `xcode-select --install` |
| Fastlane          | 2.220+  | `sudo gem install fastlane`          |
| CocoaPods         | 1.15+   | `sudo gem install cocoapods`         |
| Apple Dev Account | Paid    | Provisioning & distribution          |

## Environment Variables (MANDATORY)

| Variable          | Example                                           | Purpose                    |
| ----------------- | ------------------------------------------------- | -------------------------- |
| APPLE_ID          | `roberdan@microsoft.com`                          | Apple account login        |
| TEAM_ID           | `93T3LG4NPG`                                      | Developer Portal Team ID   |
| ITC_TEAM_ID       | `93T3LG4NPG`                                      | App Store Connect Team ID  |
| MATCH_GIT_URL     | `https://github.com/FightTheStroke/private-certs` | Certificate storage        |
| MATCH_PASSWORD    | (secure)                                          | Cert encryption passphrase |
| FASTLANE_USER     | `roberdan@microsoft.com`                          | Same as APPLE_ID           |
| FASTLANE_PASSWORD | (secure - use app-specific password)              | Apple account password     |

Add to `~/.zshrc`:

```bash
export APPLE_ID="roberdan@microsoft.com"
export TEAM_ID="93T3LG4NPG"
export ITC_TEAM_ID="93T3LG4NPG"
export MATCH_GIT_URL="https://github.com/FightTheStroke/private-certificates.git"
export MATCH_PASSWORD="your-secure-password"
export FASTLANE_USER="$APPLE_ID"
```

## Fastlane Match - Certificate Management

Match stores certificates and provisioning profiles in encrypted Git repo.

**Initial Setup** (ONE-TIME per machine):

```bash
cd ios
fastlane match development --readonly false
fastlane match appstore --readonly false
```

First machine initializes repo. Subsequent machines use default readonly mode (set in Matchfile).

**Daily Usage**:

```bash
cd ios
fastlane match appstore  # Syncs latest certs (readonly)
```

Match automatically: clones cert repo → decrypts → installs in Keychain → downloads profiles → links to Xcode.

## Build Pipeline

### Local Build Flow

```bash
npm run build:mobile:web    # 1. Build web assets (Next.js static export)
npx cap sync ios             # 2. Sync to iOS project
cd ios && fastlane beta      # 3. Deploy to TestFlight (internal)
cd ios && fastlane release   # 4. Deploy to TestFlight (external)
```

### Fastlane Lanes

| Lane      | Version | Build | TestFlight          | Tag             |
| --------- | ------- | ----- | ------------------- | --------------- |
| `beta`    | Same    | +1    | Internal only       | ios-beta/{N}    |
| `release` | +patch  | +1    | External + internal | ios-release/{N} |

Both lanes: ensure clean git → increment build → build IPA → upload → commit bump `[skip ci]` → push tags.

## TestFlight Upload Process

### Beta Lane (Internal Testing)

```bash
cd ios && fastlane beta
```

- Available to internal testers immediately (no Apple review)
- External distribution: OFF
- Processing: Background (skip_waiting: true)
- **Use for:** Quick iterations, internal QA, dev testing

### Release Lane (External Testing)

```bash
cd ios && fastlane release
```

- Version bumped (e.g., 0.12.0 → 0.12.1)
- Submitted for beta review (1-48 hrs)
- External distribution: ON, notifications: ON
- Processing: Waits for Apple (skip_waiting: false)
- **Use for:** Pre-production testing, external beta, stakeholder demos

### TestFlight Review Timeline

| Phase              | Duration | Notes                     |
| ------------------ | -------- | ------------------------- |
| Upload             | 2-5 min  | IPA processing            |
| Beta Review        | 1-48 hrs | Only for external release |
| Internal Available | Instant  | No review needed          |
| External Available | Post-rev | After Apple approves      |

## Troubleshooting

### Provisioning Profile Issues

**Error:** "No profiles for 'com.mirror-labs.MirrorBuddy' were found"

```bash
cd ios
fastlane match appstore --readonly false --force_for_new_devices

# If still failing, nuke and resync
fastlane match nuke development && fastlane match nuke appstore
fastlane match development --readonly false
fastlane match appstore --readonly false
```

### Code Signing Errors

**Error:** "Code signing is required for product type 'Application'"

1. `npm run open:ios`
2. Select "App" target → Signing & Capabilities
3. Enable "Automatically manage signing"
4. Select Team: `93T3LG4NPG`
5. Retry fastlane

**Error:** "User interaction is not allowed" (Keychain)

```bash
# Unlock Keychain (CI)
security unlock-keychain -p "$KEYCHAIN_PASSWORD" ~/Library/Keychains/login.keychain-db

# Or create dedicated build keychain
security create-keychain -p "" build.keychain
security unlock-keychain -p "" build.keychain
security set-keychain-settings -t 3600 build.keychain
```

### Build Failures

**Error:** "Command PhaseScriptExecution failed"

```bash
cd ios
xcodebuild clean -workspace App/App.xcworkspace -scheme App
rm -rf ~/Library/Developer/Xcode/DerivedData
cd App && pod deintegrate && pod install
cd .. && fastlane beta
```

**Error:** "Invalid CFBundleVersion"

Build number must be integer. Check `ios/App/App/Info.plist` → set `<key>CFBundleVersion</key><string>42</string>`.

### Capacitor Sync Issues

**Error:** "www folder not found"

```bash
npm run build:mobile:web
ls -la out/  # Verify Next.js static export
npx cap sync ios --force
```

## CI Integration (GitHub Actions)

```yaml
name: iOS Beta Release
on:
  push:
    branches: [release/ios]
jobs:
  ios-beta:
    runs-on: macos-13
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build:mobile:web
      - run: npx cap sync ios
      - run: cd ios && bundle install
      - name: Deploy to TestFlight
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          TEAM_ID: ${{ secrets.TEAM_ID }}
          ITC_TEAM_ID: ${{ secrets.ITC_TEAM_ID }}
          MATCH_GIT_URL: ${{ secrets.MATCH_GIT_URL }}
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          FASTLANE_USER: ${{ secrets.APPLE_ID }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
        run: cd ios && fastlane beta
```

**Required GitHub Secrets:** APPLE_ID, TEAM_ID, ITC_TEAM_ID, MATCH_GIT_URL, MATCH_PASSWORD, FASTLANE_PASSWORD.

## Pre-Release Checklist

- [ ] Web build completes: `npm run build:mobile:web`
- [ ] Capacitor sync successful: `npx cap sync ios`
- [ ] All environment variables set
- [ ] Clean git status (fastlane requires this)
- [ ] Certificates synced: `cd ios && fastlane match appstore`
- [ ] Xcode can build: `npm run open:ios` → Product → Build
- [ ] Version number correct in `ios/App/App.xcodeproj`

## Post-Release Verification

```bash
# Check uploaded build
open "https://appstoreconnect.apple.com/apps/YOUR_APP_ID/testflight/ios"

# Verify tags
git fetch --tags && git tag | grep ios-
git show ios-beta/42
```

## Common Commands

| Task               | Command                                                 |
| ------------------ | ------------------------------------------------------- |
| Open Xcode         | `npm run open:ios`                                      |
| Sync web to iOS    | `npx cap sync ios`                                      |
| Install pods       | `cd ios/App && pod install`                             |
| TestFlight beta    | `cd ios && fastlane beta`                               |
| TestFlight release | `cd ios && fastlane release`                            |
| Sync certificates  | `cd ios && fastlane match appstore`                     |
| Take screenshots   | `cd ios && fastlane screenshots`                        |
| Increment build    | `fastlane run increment_build_number`                   |
| Increment version  | `fastlane run increment_version_number bump_type:patch` |

## See Also

- Capacitor docs: https://capacitorjs.com/docs/ios
- Fastlane docs: https://docs.fastlane.tools
- Match guide: https://docs.fastlane.tools/actions/match/
- App Store Connect: https://appstoreconnect.apple.com
- `docs/claude/mobile-readiness.md` - Mobile UI guidelines
- `package.json` - Mobile build scripts
