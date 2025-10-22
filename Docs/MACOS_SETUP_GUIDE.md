# macOS Native App Setup Guide

**Complete step-by-step guide to add macOS 26 "Tahoe" target to MirrorBuddy**

Target Platform: **macOS 26.0+ "Tahoe"** (Apple Silicon only)
Design System: **Liquid Glass**
AI Platform: **Apple Intelligence** (Writing Tools, Siri 2.0, Spotlight)

---

## Prerequisites

### Required

- ✅ **Mac with Apple Silicon** (M1/M2/M3/M4)
- ✅ **macOS 15.0+ (Sequoia)** or later (ideally macOS 26.0 Tahoe beta)
- ✅ **Xcode 16.0+** (for macOS 26 SDK and Liquid Glass APIs)
- ✅ **Apple Developer Account** with CloudKit entitlements

### Recommended

- macOS 26.0 Tahoe (for Liquid Glass and Apple Intelligence testing)
- Xcode 16.1+ (latest betas for best macOS 26 support)
- Familiarity with Swift 6 and SwiftUI

---

## Part 1: Create macOS Target in Xcode

### Step 1.1: Open Project

1. Open `MirrorBuddy.xcodeproj` in Xcode 16+
2. In the Project Navigator, select the **MirrorBuddy** project (top item)
3. You should see the iOS target "MirrorBuddy" in the targets list

### Step 1.2: Add macOS Target

1. Click the **+ button** at the bottom of the targets list
2. Select **macOS** → **App**
3. Configure the new target:
   - **Product Name**: `MirrorBuddy`
   - **Team**: Your development team
   - **Organization Identifier**: `com.mirrorbuddy`
   - **Bundle Identifier**: `com.mirrorbuddy.MirrorBuddy.macOS`
   - **Language**: Swift
   - **User Interface**: SwiftUI
   - **Storage**: None (we'll use shared SwiftData models)

4. Click **Finish**

5. **IMPORTANT**: Xcode will create default files. **Delete these**:
   - `MirrorBuddyApp.swift` (macOS version - we have our own)
   - `ContentView.swift` (macOS version - we have our own)
   - `Assets.xcassets` (optional - can keep if you want macOS-specific assets)

### Step 1.3: Configure Build Settings

1. Select the **macOS MirrorBuddy** target
2. Go to **Build Settings** tab
3. Set the following:

**Deployment**:
- **macOS Deployment Target**: `26.0` (Tahoe)
- **Supported Platforms**: macOS
- **Architectures**: `$(ARCHS_STANDARD)` (arm64 only)

**Swift Compiler**:
- **Swift Language Version**: Swift 6
- **Swift Strict Concurrency Checking**: Complete

**Linking**:
- **Other Linker Flags**: (should include CloudKit framework)

**Code Signing**:
- **Signing Certificate**: Apple Development
- **Code Signing Identity**: Automatic
- **Development Team**: Your team

### Step 1.4: Add Capabilities

1. Still in target settings, go to **Signing & Capabilities** tab
2. Click **+ Capability** and add:
   - ✅ **iCloud** → Enable **CloudKit**
   - ✅ **App Sandbox** (required for Mac App Store)
     - Check: **Incoming/Outgoing Connections (Client)**
     - Check: **Contacts** (for Google OAuth)
     - Check: **Calendars** (for Calendar sync)
     - Check: **File Access** (User Selected File - Read/Write)
   - ✅ **Push Notifications** (if using remote notifications)

3. For CloudKit, use the same container as iOS:
   - Container: `iCloud.com.mirrorbuddy.MirrorBuddy`

---

## Part 2: Add macOS Source Files

### Step 2.1: Add macOS-Specific Files

All macOS code has been created in `MirrorBuddy/macOS/`. Now add these files to the macOS target:

1. In Xcode Project Navigator, **right-click** on `MirrorBuddy` group
2. Select **Add Files to "MirrorBuddy"...**
3. Navigate to `MirrorBuddy/macOS/`
4. Select the entire `macOS` folder
5. **IMPORTANT**: In the dialog:
   - ✅ **Copy items if needed**: UNCHECKED (files already in project)
   - ✅ **Create groups**: SELECTED
   - ✅ **Add to targets**: Check **ONLY the macOS target** (not iOS)

6. Click **Add**

You should now see `macOS` folder in Project Navigator with:
```
macOS/
├── MirrorBuddyMacApp.swift (app entry point)
├── Views/
│   ├── MacOSMainView.swift
│   ├── MacOSSidebarView.swift
│   ├── MacOSContentView.swift
│   └── MacOSToolbar.swift
├── Commands/
│   └── MirrorBuddyCommands.swift
├── Utilities/
│   ├── WindowManager.swift
│   └── FeedbackManager.swift
└── Resources/ (if any)
```

### Step 2.2: Add Shared Files to macOS Target

Most code is shared between iOS and macOS. Add these folders to **BOTH targets**:

1. Select each folder/file below in Project Navigator
2. In **File Inspector** (right panel), check **Target Membership** for BOTH:
   - ✅ MirrorBuddy (iOS)
   - ✅ MirrorBuddy (macOS)

**Folders to add**:
- ✅ `Core/Models/` - All SwiftData models
- ✅ `Core/Services/` - All business logic services
- ✅ `Core/API/` - Network clients (OpenAI, Google, etc.)
- ✅ `Core/Extensions/` - Swift extensions (Font+OpenDyslexic, etc.)
- ✅ `Core/Utilities/` - Shared utilities
- ✅ `Features/Dashboard/Views/` - Dashboard SwiftUI views
- ✅ `Features/Study/` - Study views
- ✅ `Features/Tasks/` - Task views
- ✅ `Features/Voice/` - Voice views
- ✅ `Features/Settings/` - Settings views

**EXCLUDE from macOS** (iOS-only):
- ❌ `Features/Camera/` - Uses iOS camera
- ❌ `Features/Materials/DocumentScannerView.swift` - Uses VisionKit (iOS)
- ❌ `Core/Utilities/HapticFeedbackManager.swift` - Use `FeedbackManager.swift` instead

### Step 2.3: Add OpenDyslexic Fonts to macOS

1. In Project Navigator, find `MirrorBuddy/Resources/Fonts/`
2. Select all OpenDyslexic font files:
   - `OpenDyslexic-Regular.ttf`
   - `OpenDyslexic-Bold.ttf`
   - `OpenDyslexic-Italic.ttf`
   - `OpenDyslexic-BoldItalic.ttf`

3. In File Inspector, add to **macOS target**:
   - ✅ Target Membership → MirrorBuddy (macOS)

4. Update `Info.plist` for macOS target:
   - Add key: `Fonts provided by application`
   - Add items:
     - `OpenDyslexic-Regular.ttf`
     - `OpenDyslexic-Bold.ttf`
     - `OpenDyslexic-Italic.ttf`
     - `OpenDyslexic-BoldItalic.ttf`

---

## Part 3: Configure Info.plist (macOS)

The macOS target needs its own `Info.plist`. Create or edit `MirrorBuddy/macOS/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- App Info -->
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundleDisplayName</key>
    <string>MirrorBuddy</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundleShortVersionString</key>
    <string>0.9.0</string>

    <!-- Minimum macOS Version -->
    <key>LSMinimumSystemVersion</key>
    <string>26.0</string>

    <!-- Apple Silicon Only -->
    <key>LSMinimumSystemVersionByArchitecture</key>
    <dict>
        <key>arm64</key>
        <string>26.0</string>
    </dict>

    <!-- OpenDyslexic Fonts -->
    <key>UIAppFonts</key>
    <array>
        <string>OpenDyslexic-Regular.ttf</string>
        <string>OpenDyslexic-Bold.ttf</string>
        <string>OpenDyslexic-Italic.ttf</string>
        <string>OpenDyslexic-BoldItalic.ttf</string>
    </array>

    <!-- Apple Intelligence -->
    <key>NSAppleIntelligenceUsageDescription</key>
    <string>MirrorBuddy uses Apple Intelligence to help you study better with AI-powered summaries, writing assistance, and smart suggestions tailored to your learning style.</string>

    <!-- Google OAuth (same as iOS) -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>com.googleusercontent.apps.YOUR-GOOGLE-CLIENT-ID</string>
            </array>
        </dict>
    </array>

    <!-- Network Usage -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
        <key>NSExceptionDomains</key>
        <dict>
            <key>googleapis.com</key>
            <dict>
                <key>NSExceptionAllowsInsecureHTTPLoads</key>
                <true/>
                <key>NSIncludesSubdomains</key>
                <true/>
            </dict>
        </dict>
    </dict>

    <!-- Privacy Permissions -->
    <key>NSMicrophoneUsageDescription</key>
    <string>MirrorBuddy needs microphone access for voice conversations to help you study.</string>

    <key>NSCalendarsUsageDescription</key>
    <string>MirrorBuddy syncs your calendar to schedule study sessions and track assignments.</string>

    <key>NSContactsUsageDescription</key>
    <string>MirrorBuddy may access contacts for Google account integration.</string>

    <!-- CloudKit -->
    <key>NSUbiquitousContainers</key>
    <dict>
        <key>iCloud.com.mirrorbuddy.MirrorBuddy</key>
        <dict>
            <key>NSUbiquitousContainerIsDocumentScopePublic</key>
            <false/>
            <key>NSUbiquitousContainerName</key>
            <string>MirrorBuddy</string>
            <key>NSUbiquitousContainerSupportedFolderLevels</key>
            <string>Any</string>
        </dict>
    </dict>
</dict>
</plist>
```

---

## Part 4: Build and Test

### Step 4.1: Select macOS Scheme

1. In Xcode toolbar, click the scheme selector (next to Play button)
2. Select **MirrorBuddy (macOS)** → **My Mac (Apple Silicon)**

### Step 4.2: Build Project

1. Press **Cmd+B** to build
2. Fix any compilation errors:
   - **UIKit imports**: Make sure all UIKit code is wrapped in `#if os(iOS)`
   - **Missing files**: Ensure all shared files are added to macOS target
   - **OpenDyslexic fonts**: Verify fonts are in target and Info.plist

### Step 4.3: Run on Mac

1. Press **Cmd+R** to run
2. The app should launch with:
   - ✨ **Liquid Glass sidebar** (translucent, beautiful)
   - 🪟 **macOS native window** (resizable, 1200x800 default)
   - 🎨 **OpenDyslexic fonts** throughout
   - 📋 **Menu bar commands** (File, Edit, View, Window, Help)

### Step 4.4: Test Core Features

**Voice First**:
- Press **Cmd+Shift+V** → Should open voice conversation
- Microphone permission prompt should appear
- Test voice input and response

**Navigation**:
- Press **Cmd+1** → Materials
- Press **Cmd+2** → Study
- Press **Cmd+3** → Tasks
- Press **Cmd+4** → Voice
- Press **Cmd+Shift+L** → Toggle sidebar

**Window Management**:
- Press **Cmd+Shift+T** → Always on Top (verify window stays above others)
- Resize window → Quit → Relaunch → Window should restore size/position
- Press **Cmd+M** → Minimize window

**Liquid Glass**:
- Open **System Settings → Accessibility → Display**
- Toggle **Reduce Transparency**
- App should respect setting (glass becomes solid when enabled)

**Apple Intelligence** (macOS 26 only):
- Select text in a note or material
- Press **Cmd+Shift+W** → Writing Tools should appear
- Test: Rewrite, Proofread, Summarize

**CloudKit Sync**:
- Add a material on iPhone/iPad
- Check if it appears on Mac (may take a few seconds)
- Verify bidirectional sync works

---

## Part 5: SwiftLint & Quality

### Step 5.1: Run SwiftLint

macOS target should use the same `.swiftlint.yml` as iOS:

```bash
cd /path/to/MirrorBuddy
swiftlint lint
```

**Target**: 0 violations (same as iOS requirement)

### Step 5.2: Fix Warnings

Build with **Cmd+B** and check **Issue Navigator** (Cmd+5):

- **Target**: 0 warnings
- **Target**: 0 errors

Common warnings to fix:
- Unused variables
- Force unwrapping (`!`)
- Deprecated APIs
- Missing accessibility labels

---

## Part 6: App Icon (macOS-Specific)

### Step 6.1: Create macOS App Icon

macOS uses a different icon format:

1. Create 1024x1024px icon (PNG, rounded square)
2. Use **Image2Icon** or **Icon Slate** to generate `.icns` file
3. Add to `MirrorBuddy/macOS/Resources/Assets.xcassets`
4. In target settings, set **App Icon** to the new asset

**Design Guidelines**:
- Rounded square (not iOS rounded corners)
- Consistent with iOS icon but optimized for macOS
- Test in Dock, Launchpad, Spotlight

---

## Part 7: Release Build

### Step 7.1: Archive for Distribution

1. Select **Product → Archive** (Cmd+Shift+B won't work - must use menu)
2. Xcode will build release version
3. Organizer window opens with archives

### Step 7.2: Export for Mac App Store or Direct Distribution

**Mac App Store**:
1. Click **Distribute App**
2. Select **Mac App Store**
3. Follow prompts for signing and upload

**Direct Distribution** (notarized):
1. Click **Distribute App**
2. Select **Developer ID**
3. Export and notarize with:
   ```bash
   xcrun notarytool submit MirrorBuddy.zip \
     --apple-id your@email.com \
     --team-id TEAMID \
     --password app-specific-password
   ```

---

## Troubleshooting

### Issue: "Could not find module 'SwiftData'"

**Solution**: Ensure macOS Deployment Target is 14.0+ (SwiftData requires macOS 14+)

### Issue: OpenDyslexic fonts not loading

**Solution**:
1. Verify fonts are in **Copy Bundle Resources** build phase
2. Check `Info.plist` has `UIAppFonts` key with correct filenames
3. Print available fonts in debug:
   ```swift
   print(NSFontManager.shared.availableFonts)
   ```

### Issue: CloudKit not syncing

**Solution**:
1. Sign in to iCloud on Mac (System Settings → Apple ID)
2. Verify CloudKit container is enabled in Capabilities
3. Check Console.app for CloudKit errors
4. Ensure same container ID as iOS

### Issue: "Liquid Glass" not visible

**Solution**:
- Ensure you're on macOS 26 Tahoe (Liquid Glass is macOS 26+)
- Check "Reduce Transparency" is OFF in Accessibility settings
- Verify `.glassEffect()` modifiers are present in code
- Rebuild with macOS 26 SDK (Xcode 16.1+)

### Issue: Menu bar commands not working

**Solution**:
1. Verify `MirrorBuddyCommands` is in app body's `.commands {}`
2. Check keyboard shortcuts don't conflict with system shortcuts
3. Test in isolated environment (close other apps)

### Issue: "Always on Top" not working

**Solution**:
- Ensure `WindowManager.shared.setAlwaysOnTop(true)` is called
- Check `window.level = .floating` in WindowManager
- Restart app after enabling

---

## Next Steps

Once the macOS app is running:

1. ✅ **Test all features** from QA checklist (create macOS version)
2. ✅ **Optimize for macOS 26** - leverage Liquid Glass, Apple Intelligence
3. ✅ **Add macOS-specific features**:
   - Menu bar status item (optional)
   - Spotlight integration
   - Quick Look previews
   - Handoff with iOS
4. ✅ **Performance profiling** with Instruments
5. ✅ **Accessibility testing** with VoiceOver
6. ✅ **Beta testing** with Mario and other users

---

## Resources

- [macOS 26 Tahoe Release Notes](https://developer.apple.com/documentation/macos-release-notes)
- [Liquid Glass Design Guidelines](https://developer.apple.com/design/liquid-glass/)
- [Apple Intelligence for Developers](https://developer.apple.com/apple-intelligence/)
- [SwiftUI for macOS](https://developer.apple.com/tutorials/swiftui-macos)
- [Mac App Store Submission Guide](https://developer.apple.com/app-store/submissions/)

---

**Setup Complete!** 🎉

You now have a **native macOS 26 "Tahoe" app** with:
- ✨ Liquid Glass translucent UI
- 🤖 Apple Intelligence integration
- ♿️ Full accessibility (OpenDyslexic, VoiceOver, keyboard navigation)
- 🔄 CloudKit sync with iOS
- 🎯 One-handed operation optimized for Mario

**Enjoy building the future of accessible learning on macOS!** 🚀
