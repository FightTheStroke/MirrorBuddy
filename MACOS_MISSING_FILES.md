# macOS Target - Missing File Memberships

## Status
❌ **macOS build currently FAILS** - 20+ errors
✅ **iOS build works perfectly**

## Root Cause
Many shared Core files are not added to the "MirrorBuddy macOS" target membership in Xcode.

## How to Fix (5 Minutes in Xcode)

### Step 1: Open Project in Xcode
```bash
open MirrorBuddy.xcodeproj
```

### Step 2: Select macOS Target
1. Click on **MirrorBuddy** project in Navigator (top level)
2. Select **"MirrorBuddy macOS"** target from the target list

### Step 3: Add Missing Files to Target

For each file listed below:
1. **Select the file** in Project Navigator (left sidebar)
2. Open **File Inspector** (⌥⌘1 or right sidebar → top icon)
3. Under **"Target Membership"** section, **CHECK** the box for "MirrorBuddy macOS"

## Required Files for macOS Target

### Core/Models (MUST ADD)
- ✅ `MirrorBuddy/Core/Models/SubjectEntity.swift`
- ✅ `MirrorBuddy/Core/Models/Material.swift`
- ✅ `MirrorBuddy/Core/Models/MindMap.swift`
- ✅ `MirrorBuddy/Core/Models/MindMapNode.swift`
- ✅ `MirrorBuddy/Core/Models/Flashcard.swift`
- ✅ `MirrorBuddy/Core/Models/Task.swift`
- ✅ `MirrorBuddy/Core/Models/UserProgress.swift`
- ✅ `MirrorBuddy/Core/Models/TrackedDriveFile.swift`
- ✅ `MirrorBuddy/Core/Models/Transcript.swift`
- ✅ `MirrorBuddy/Core/Models/VoiceMessage.swift`
- ✅ `MirrorBuddy/Core/Models/VoiceConversation.swift`
- ✅ `MirrorBuddy/Core/Models/StudySession.swift`
- ✅ `MirrorBuddy/Core/Models/Subject.swift`
- ✅ `MirrorBuddy/Core/Models/VoiceSessionState.swift`

### Core/Services (MUST ADD)
- ✅ `MirrorBuddy/Core/Services/GoogleOAuthService.swift` **← CRITICAL**
- ✅ `MirrorBuddy/Core/Services/GoogleOAuthConfig.swift`
- ✅ `MirrorBuddy/Core/Services/KeychainManager.swift`
- ✅ `MirrorBuddy/Core/Services/UpdateManager.swift`
- ✅ `MirrorBuddy/Core/Services/DriveSyncService.swift`
- ✅ `MirrorBuddy/Core/Services/BackgroundSyncService.swift`
- ✅ `MirrorBuddy/Core/Services/GmailService.swift`
- ✅ `MirrorBuddy/Core/Services/GoogleCalendarService.swift`
- ✅ `MirrorBuddy/Core/Services/NotificationManager.swift`
- ✅ `MirrorBuddy/Core/Services/OfflineManager.swift`
- ✅ `MirrorBuddy/Core/Services/PerformanceMonitor.swift`
- ✅ `MirrorBuddy/Core/Services/SubjectService.swift`
- ✅ `MirrorBuddy/Core/Services/DataMigrationService.swift`
- ❌ `MirrorBuddy/Core/Services/AudioPipelineManager.swift` **← iOS-only (AVAudioEngine)**

### Core/API (MUST ADD)
- ✅ `MirrorBuddy/Core/API/GoogleDrive/GoogleDriveClient.swift`
- ✅ `MirrorBuddy/Core/API/GoogleDrive/DriveModels.swift`
- ✅ `MirrorBuddy/Core/API/OpenAI/OpenAIClient.swift`
- ✅ `MirrorBuddy/Core/API/OpenAI/OpenAIModels.swift`
- ✅ `MirrorBuddy/Core/API/OpenAI/RealtimeAPI/`  (entire folder)

### Core/Managers (MUST ADD)
- ✅ `MirrorBuddy/Core/Managers/CloudKitSyncMonitor.swift`
- ✅ `MirrorBuddy/Core/Managers/LocalizationManager.swift`
- ✅ `MirrorBuddy/Core/Managers/AppVoiceCommandHandler.swift`

### Core/Extensions (MUST ADD)
- ✅ `MirrorBuddy/Core/Extensions/` (all files)

### Core/Intents (MUST ADD - Siri Support)
- ✅ `MirrorBuddy/Core/Intents/StartConversationIntent.swift`
- ✅ `MirrorBuddy/Core/Intents/AppShortcutsProvider.swift`

### Features/ (Shared Views - MUST ADD)
Most views can work on macOS with minor adjustments:

- ✅ `MirrorBuddy/Features/Auth/` (all files)
- ✅ `MirrorBuddy/Features/Settings/` (all files)
- ✅ `MirrorBuddy/Features/Materials/Models/`
- ✅ `MirrorBuddy/Features/Materials/Services/`
- ⚠️ `MirrorBuddy/Features/Materials/Views/` (most files, EXCEPT DocumentScannerView - already wrapped)
- ✅ `MirrorBuddy/Features/Study/` (all files)
- ✅ `MirrorBuddy/Features/Voice/` (all files - voice works on macOS!)
- ✅ `MirrorBuddy/Features/Tasks/` (all files)
- ✅ `MirrorBuddy/Features/Onboarding/` (most files)

### Resources (MUST ADD)
- ✅ `MirrorBuddy/Resources/Fonts/` (all .otf files)
- ✅ `MirrorBuddy/Resources/Assets.xcassets`
- ✅ `MirrorBuddy/Resources/Localizable.xcstrings`

### Files ALREADY ADDED to macOS Target ✅
These are macOS-only files, already correctly configured:
- ✅ `MirrorBuddy/macOS/MirrorBuddyMacApp.swift`
- ✅ `MirrorBuddy/macOS/Views/MacOSMainView.swift`
- ✅ `MirrorBuddy/macOS/Views/MacOSContentView.swift`
- ✅ `MirrorBuddy/macOS/Views/MacOSSidebarView.swift`
- ✅ `MirrorBuddy/macOS/Views/MacOSToolbar.swift`
- ✅ `MirrorBuddy/macOS/Utilities/WindowManager.swift`
- ✅ `MirrorBuddy/macOS/Utilities/FeedbackManager.swift`
- ✅ `MirrorBuddy/macOS/Commands/MirrorBuddyCommands.swift`

### Files to EXCLUDE from macOS Target ❌
These are iOS-only and should NOT be added:
- ❌ `MirrorBuddy/Features/Materials/Views/DocumentScannerView.swift` (wrapped with #if os(iOS))
- ❌ `MirrorBuddy/Core/Services/AudioPipelineManager.swift` (uses AVAudioEngine - iOS only)
- ❌ `MirrorBuddy/MirrorBuddyApp.swift` (iOS app entry point)

## Quick Method: Add Entire Folders

Instead of adding files one by one, you can add entire folders:

1. Select **`MirrorBuddy/Core`** folder in Project Navigator
2. File Inspector → Target Membership → CHECK "MirrorBuddy macOS"
3. Repeat for:
   - `MirrorBuddy/Features/Auth`
   - `MirrorBuddy/Features/Settings`
   - `MirrorBuddy/Features/Materials` (except DocumentScannerView - already wrapped)
   - `MirrorBuddy/Features/Study`
   - `MirrorBuddy/Features/Voice`
   - `MirrorBuddy/Features/Tasks`
   - `MirrorBuddy/Resources`

4. Then UNCHECK these specific files:
   - DocumentScannerView.swift (wrapped, won't compile anyway)
   - AudioPipelineManager.swift (iOS-only)

## Verification

After adding files, test the build:

```bash
xcodebuild -scheme "MirrorBuddy macOS" -destination 'platform=macOS' build
```

Expected result: **✅ BUILD SUCCEEDED**

## Current Errors (Before Fix)

```
error: cannot find 'GoogleOAuthService' in scope
error: cannot find 'SubjectEntity' in scope
error: cannot find type 'VNDocumentCameraViewController' in scope (FIXED - wrapped with #if os(iOS))
error: cannot find type 'UIViewControllerRepresentable' in scope (FIXED - wrapped)
```

After adding files to target: **ALL ERRORS SHOULD BE RESOLVED**

## Alternative: Command Line (Advanced)

If you prefer command line, you can use `xcodebuild` to add files, but it's much easier to do it in Xcode GUI.

## Time Estimate

- **5 minutes** if adding entire folders (recommended)
- **15 minutes** if adding files individually
- **0 seconds** if using automated script (risky, not recommended for project.pbxproj)

## Status After Fix

Once files are added to macOS target:

```
✅ iOS (iPhone): BUILD SUCCEEDED
✅ iOS (iPad):   BUILD SUCCEEDED
✅ macOS:        BUILD SUCCEEDED  ← Will work after adding files
```

---

**Last Updated**: 2025-10-22 after fixing DocumentScannerView iOS guards
**Blocking Issue**: File target membership (requires Xcode GUI)
**Estimated Fix Time**: 5 minutes
