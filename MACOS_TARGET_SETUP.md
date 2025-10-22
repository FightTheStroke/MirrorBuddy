# macOS Target Setup Guide

## Overview
This document provides step-by-step instructions for creating a native macOS target in MirrorBuddy, enabling the app to run on macOS 26 "Tahoe" with Liquid Glass UI.

## Prerequisites
- Xcode 16+ installed
- MirrorBuddy.xcodeproj opened
- All iOS build issues resolved (current status: ✅ BUILD SUCCEEDED)

## Step-by-Step Instructions

### 1. Create New macOS Target

1. Open `MirrorBuddy.xcodeproj` in Xcode 16+
2. Click on the project name (MirrorBuddy) in the Project Navigator
3. Click the "+" button at the bottom of the Targets list
4. Select **macOS** → **App**
5. Configure the target:
   - **Product Name**: `MirrorBuddy macOS`
   - **Team**: Your development team
   - **Organization Identifier**: `com.mirror-labs`
   - **Bundle Identifier**: `com.mirror-labs.MirrorBuddy.macOS`
   - **Interface**: SwiftUI
   - **Language**: Swift
   - **Minimum macOS Version**: macOS 26.0 (or 15.0 if 26.0 not available yet)
6. Click **Finish**
7. **IMPORTANT**: Delete the auto-generated files (ContentView.swift, MirrorBuddy_macOSApp.swift) - we have our own

### 2. Add macOS-Specific Files to macOS Target

Select the following files in Project Navigator and check the **MirrorBuddy macOS** target in File Inspector (right sidebar):

#### macOS App Entry Point
- `MirrorBuddy/macOS/MirrorBuddyMacApp.swift` ✅

#### macOS Views
- `MirrorBuddy/macOS/Views/MacOSMainView.swift` ✅
- `MirrorBuddy/macOS/Views/MacOSContentView.swift` ✅
- `MirrorBuddy/macOS/Views/MacOSSidebarView.swift` ✅
- `MirrorBuddy/macOS/Views/MacOSToolbar.swift` ✅

#### macOS Utilities
- `MirrorBuddy/macOS/Utilities/WindowManager.swift` ✅
- `MirrorBuddy/macOS/Utilities/FeedbackManager.swift` ✅

#### macOS Commands
- `MirrorBuddy/macOS/Commands/MirrorBuddyCommands.swift` ✅

### 3. Add Shared Code to BOTH Targets

Select each folder/file and ensure BOTH **MirrorBuddy** (iOS) and **MirrorBuddy macOS** targets are checked:

#### Core (Shared Models, Services, etc.)
- `MirrorBuddy/Core/` (entire folder) 📦
  - Models/
  - Services/
  - Managers/
  - Intents/
  - Extensions/

#### Features (Shared UI and Logic)
- `MirrorBuddy/Features/` (entire folder) 📦
  - Auth/
  - Materials/
  - Study/
  - Voice/
  - Tasks/
  - Settings/
  - Onboarding/

#### Resources (Fonts, Assets, Localization)
- `MirrorBuddy/Resources/` (entire folder) 📦
  - Fonts/ (OpenDyslexic fonts)
  - Assets.xcassets
  - Localizable.xcstrings

**NOTE**: The iOS app entry point (`MirrorBuddyApp.swift`) should ONLY be in the iOS target, not macOS.

### 4. Configure Build Settings

#### macOS Target Build Settings

1. Select **MirrorBuddy macOS** target
2. Click **Build Settings** tab
3. Search for "ENABLE_USER_SCRIPT_SANDBOXING"
4. Set to **NO** (required for font copying script)
5. Search for "MARKETING_VERSION"
6. Set to **1.0** (match iOS version)
7. Search for "CURRENT_PROJECT_VERSION"
8. Set to **1** (match iOS version)

### 5. Copy OpenDyslexic Fonts Build Phase (macOS)

1. Select **MirrorBuddy macOS** target
2. Click **Build Phases** tab
3. Click "+" → **New Run Script Phase**
4. Rename to "Copy OpenDyslexic Fonts"
5. Drag it above "Embed Frameworks" phase
6. Add script:

```bash
# Copy OpenDyslexic fonts to macOS app bundle
FONTS_SRC="${SRCROOT}/MirrorBuddy/Resources/Fonts"
FONTS_DEST="${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/Contents/Resources/Fonts"

echo "Copying OpenDyslexic fonts to macOS bundle..."
mkdir -p "${FONTS_DEST}"
cp "${FONTS_SRC}"/OpenDyslexic-*.otf "${FONTS_DEST}/"
echo "✅ Fonts copied to ${FONTS_DEST}"
```

7. Add Input Files:
   - `$(SRCROOT)/MirrorBuddy/Resources/Fonts/OpenDyslexic-Regular.otf`
   - `$(SRCROOT)/MirrorBuddy/Resources/Fonts/OpenDyslexic-Bold.otf`
   - `$(SRCROOT)/MirrorBuddy/Resources/Fonts/OpenDyslexic-Italic.otf`
   - `$(SRCROOT)/MirrorBuddy/Resources/Fonts/OpenDyslexic-Bold-Italic.otf`

8. Add Output Files:
   - `$(BUILT_PRODUCTS_DIR)/$(PRODUCT_NAME).app/Contents/Resources/Fonts/OpenDyslexic-Regular.otf`
   - `$(BUILT_PRODUCTS_DIR)/$(PRODUCT_NAME).app/Contents/Resources/Fonts/OpenDyslexic-Bold.otf`
   - `$(BUILT_PRODUCTS_DIR)/$(PRODUCT_NAME).app/Contents/Resources/Fonts/OpenDyslexic-Italic.otf`
   - `$(BUILT_PRODUCTS_DIR)/$(PRODUCT_NAME).app/Contents/Resources/Fonts/OpenDyslexic-Bold-Italic.otf`

### 6. Configure Capabilities

#### iOS Target (MirrorBuddy)
1. Select **MirrorBuddy** target
2. Click **Signing & Capabilities** tab
3. Ensure these are enabled:
   - ✅ iCloud (CloudKit)
   - ✅ Background Modes (Background fetch, Remote notifications)
   - ✅ Push Notifications
   - ✅ Siri
   - ✅ App Groups

#### macOS Target (MirrorBuddy macOS)
1. Select **MirrorBuddy macOS** target
2. Click **Signing & Capabilities** tab
3. Click "+" to add capabilities:
   - ✅ iCloud (CloudKit) - **CRITICAL**: Use same container `iCloud.com.mirrorbuddy.MirrorBuddy`
   - ✅ App Sandbox
     - Enable "Incoming Connections (Server)"
     - Enable "Outgoing Connections (Client)"
     - Enable "User Selected Files" (Read/Write)
   - ✅ Push Notifications (if needed)
   - ✅ Siri (if voice features needed on macOS)

**IMPORTANT**: CloudKit container MUST match iOS (`iCloud.com.mirrorbuddy.MirrorBuddy`) for data sync to work.

### 7. Configure Info.plist (macOS)

#### Font Registration
Add to macOS target's Info.plist:

```xml
<key>ATSApplicationFontsPath</key>
<string>Fonts/</string>
<key>UIAppFonts</key>
<array>
    <string>Fonts/OpenDyslexic-Regular.otf</string>
    <string>Fonts/OpenDyslexic-Bold.otf</string>
    <string>Fonts/OpenDyslexic-Italic.otf</string>
    <string>Fonts/OpenDyslexic-Bold-Italic.otf</string>
</array>
```

#### App Category
```xml
<key>LSApplicationCategoryType</key>
<string>public.app-category.education</string>
```

#### Minimum macOS Version
```xml
<key>LSMinimumSystemVersion</key>
<string>26.0</string>
```

### 8. Build and Test

#### Test iOS Build (Verify No Regression)
```bash
xcodebuild -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 16 Pro' clean build
```

Expected: ✅ **BUILD SUCCEEDED**

#### Test macOS Build (New Target)
```bash
xcodebuild -scheme "MirrorBuddy macOS" -destination 'platform=macOS' clean build
```

Expected: ✅ **BUILD SUCCEEDED**

#### Run macOS App
1. Select **MirrorBuddy macOS** scheme in Xcode
2. Select "My Mac" as destination
3. Press **Cmd+R** to build and run
4. Verify:
   - App launches with Liquid Glass UI
   - Sidebar navigation works
   - Toolbar buttons functional
   - OpenDyslexic fonts load correctly
   - CloudKit sync works (same data as iOS)

### 9. Common Issues & Fixes

#### Issue: "Cannot find 'WindowManager' in scope" (iOS build)
**Fix**: Ensure all macOS-specific files are wrapped with `#if os(macOS)` (already done ✅)

#### Issue: Fonts not loading on macOS
**Fix**:
1. Verify fonts are copied to `Contents/Resources/Fonts/`
2. Check Info.plist has correct `ATSApplicationFontsPath`
3. Ensure build script has correct output path for macOS bundle structure

#### Issue: CloudKit data not syncing between iOS and macOS
**Fix**:
1. Verify both targets use SAME CloudKit container identifier
2. Check CloudKit capability is enabled on both targets
3. Ensure both apps are signed with same team/provisioning profile

#### Issue: Duplicate symbol errors
**Fix**: Ensure iOS-only files (like `MirrorBuddyApp.swift`) are NOT added to macOS target

#### Issue: App Sandbox preventing file access
**Fix**: Configure App Sandbox capabilities correctly:
- Enable "User Selected Files" for document access
- Enable "Outgoing Connections" for network access

### 10. Scheme Configuration

#### Create macOS Scheme
1. Click scheme selector in Xcode toolbar
2. Select **Manage Schemes...**
3. Ensure "MirrorBuddy macOS" scheme exists
4. Check "Show" checkbox to make it visible
5. Click **Edit...** on the scheme
6. Configure:
   - **Run**: Set executable to "MirrorBuddy macOS.app"
   - **Build**: Ensure only macOS target builds for this scheme
   - **Test**: Configure unit test target if needed

## Verification Checklist

Before considering the macOS target complete:

- [ ] iOS build still succeeds (no regression)
- [ ] macOS build succeeds independently
- [ ] macOS app launches on My Mac
- [ ] Sidebar navigation works
- [ ] Toolbar buttons functional
- [ ] OpenDyslexic fonts render correctly
- [ ] CloudKit data syncs between iOS and macOS
- [ ] Voice features work (if implemented)
- [ ] App Sandbox permissions correct
- [ ] Window state persists (WindowManager)
- [ ] Menu bar commands work (MirrorBuddyCommands)

## Architecture Notes

### Platform Guards
All platform-specific code is wrapped with compiler directives:
- `#if os(iOS)` - iOS-only code
- `#if os(macOS)` - macOS-only code
- No guard - Shared code (works on both platforms)

### Shared Components
These are designed to work on BOTH platforms:
- Core models (SwiftData @Model classes)
- Services (CloudKit, Drive, Gmail, Calendar)
- Voice conversation logic
- Authentication (Google OAuth)
- Localization

### Platform-Specific Components
#### iOS Only
- `MirrorBuddyApp.swift` - iOS app entry point
- iOS-specific UI components (if any)

#### macOS Only
- `MirrorBuddyMacApp.swift` - macOS app entry point
- `WindowManager.swift` - Window frame persistence
- `FeedbackManager.swift` - macOS haptic/audio feedback
- `MirrorBuddyCommands.swift` - Menu bar commands
- macOS Views (MacOSMainView, MacOSSidebarView, MacOSToolbar, MacOSContentView)

## Current Status

### ✅ Completed
- iOS build working (ZERO errors)
- macOS files created and wrapped with platform guards
- Duplicate declaration issues fixed (startVoiceConversation)
- Font copying build phase configured for iOS

### 🔄 Next Steps
1. **Create macOS target in Xcode** (requires GUI, cannot automate)
2. Add files to appropriate targets (follow Section 2-3)
3. Configure capabilities (follow Section 6)
4. Configure build phases (follow Section 5)
5. Test macOS build (follow Section 8)

## Additional Resources

- [Apple: Creating a macOS App](https://developer.apple.com/documentation/xcode/creating-a-macos-app)
- [SwiftUI for macOS](https://developer.apple.com/tutorials/swiftui-concepts/exploring-the-structure-of-a-swiftui-app)
- [CloudKit: Sharing Data Between Devices](https://developer.apple.com/documentation/cloudkit/shared_records)
- [App Sandbox](https://developer.apple.com/documentation/security/app_sandbox)

---

**Generated**: 2025-10-22
**Last Updated**: After resolving macOS integration issues post-PR #2 merge
**Status**: Ready for target creation in Xcode
