# CloudKit Configuration Guide

## Overview

MirrorBuddy uses CloudKit for automatic data synchronization across Mario's devices. This document outlines the CloudKit setup process and configuration details.

## Container Information

- **Container ID**: `iCloud.com.mirrorbuddy.MirrorBuddy`
- **Bundle ID**: `com.mirrorbuddy.MirrorBuddy`
- **Services**: CloudKit, Push Notifications

## Prerequisites

Before configuring CloudKit, ensure you have:

1. Active Apple Developer Program membership
2. Xcode 15.0 or later
3. iOS 17.0+ deployment target
4. Valid provisioning profiles

## Configuration Steps

### 1. Xcode Project Setup

The project is already configured with CloudKit entitlements:

**File**: `MirrorBuddy/MirrorBuddy.entitlements`

```xml
<key>com.apple.developer.icloud-container-identifiers</key>
<array>
    <string>iCloud.com.mirrorbuddy.MirrorBuddy</string>
</array>
<key>com.apple.developer.icloud-services</key>
<array>
    <string>CloudKit</string>
</array>
```

### 2. Enable iCloud Capability in Xcode

To verify or enable iCloud capability:

1. Open `MirrorBuddy.xcodeproj` in Xcode
2. Select the **MirrorBuddy** target
3. Go to **Signing & Capabilities** tab
4. Ensure **iCloud** capability is added
5. Check **CloudKit** service under iCloud
6. Verify container: `iCloud.com.mirrorbuddy.MirrorBuddy`

### 3. Apple Developer Portal Setup

#### Create CloudKit Container

1. Navigate to [Apple Developer Portal](https://developer.apple.com)
2. Go to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** → **iCloud Containers**
4. Click **+** to create new container (if not exists)
5. Set identifier: `iCloud.com.mirrorbuddy.MirrorBuddy`
6. Add description: "MirrorBuddy Data Sync"
7. Click **Continue** and **Register**

#### Configure App ID

1. Go to **Identifiers** → **App IDs**
2. Select `com.mirrorbuddy.MirrorBuddy` (or create if needed)
3. Enable **iCloud** capability
4. Click **Edit** for iCloud
5. Select **Include CloudKit support (requires Xcode 5)**
6. Add container: `iCloud.com.mirrorbuddy.MirrorBuddy`
7. Save changes

### 4. CloudKit Dashboard Configuration

#### Access Dashboard

1. Go to [CloudKit Dashboard](https://icloud.developer.apple.com/dashboard/)
2. Select `iCloud.com.mirrorbuddy.MirrorBuddy` container
3. Choose **Development** environment initially

#### Configure Record Types

CloudKit will automatically create record types when SwiftData models are synced. The following record types will be created:

##### SubjectEntity
- `localizationKey` (String, Indexed)
- `iconName` (String)
- `colorName` (String)
- `sortOrder` (Int64)
- `isActive` (Int64 - Boolean)
- `isCustom` (Int64 - Boolean)

##### Material
- `title` (String, Indexed)
- `createdAt` (Date/Time)
- `googleDriveFileID` (String, Indexed)
- `subject` (Reference to SubjectEntity)

##### MindMap
- `title` (String)
- `createdAt` (Date/Time)
- `material` (Reference to Material)

##### MindMapNode
- `title` (String)
- `content` (String)
- `level` (Int64)
- `orderIndex` (Int64)
- `parentNode` (Reference to MindMapNode, nullable)
- `mindMap` (Reference to MindMap)

##### Flashcard
- `question` (String)
- `answer` (String)
- `createdAt` (Date/Time)
- `lastReviewed` (Date/Time, nullable)
- `nextReview` (Date/Time, nullable)
- `easeFactor` (Double)
- `interval` (Int64)
- `repetitions` (Int64)
- `material` (Reference to Material)

##### Task
- `title` (String, Indexed)
- `taskDescription` (String, nullable)
- `dueDate` (Date/Time, nullable)
- `isCompleted` (Int64 - Boolean)
- `priority` (Int64)
- `subject` (Reference to SubjectEntity, nullable)
- `material` (Reference to Material, nullable)

##### UserProgress
- `totalStudyMinutes` (Int64)
- `currentStreak` (Int64)
- `longestStreak` (Int64)
- `lastStudyDate` (Date/Time, nullable)
- `completedFlashcards` (Int64)
- `createdMindMaps` (Int64)
- `completedTasks` (Int64)
- `achievements` (String Array)

#### Security Settings

For single-user app (Mario only):

1. Go to **Security Roles** in CloudKit Dashboard
2. Keep default **World** role with:
   - **Read**: None
   - **Write**: None
3. **Authenticated** users (Mario) should have:
   - **Read**: All user records
   - **Write**: All user records

### 5. Environment Configuration

#### Development Environment

- Used during development and testing
- Data stored separately from production
- Automatic setup when running from Xcode

#### Production Environment

- Used for App Store builds
- Must deploy schema from development before release
- Data is persistent and user-facing

**To Deploy Schema to Production:**

1. Open CloudKit Dashboard
2. Select **Development** environment
3. Go to **Schema** → **Deploy to Production**
4. Review changes carefully
5. Click **Deploy**
6. Confirm deployment

⚠️ **Warning**: Schema changes in production are restricted. Plan carefully before deploying.

## SwiftData + CloudKit Integration

### Model Configuration

The app uses SwiftData with CloudKit sync configured in `MirrorBuddyApp.swift`:

```swift
let modelConfiguration = ModelConfiguration(
    schema: schema,
    isStoredInMemoryOnly: false,
    cloudKitDatabase: .automatic
)
```

### Automatic Sync

- SwiftData automatically syncs to CloudKit
- Changes propagate to all signed-in devices
- Conflict resolution: last-write-wins (suitable for single user)

### Testing Sync

1. Run app on two devices with same iCloud account
2. Make changes on device A
3. Wait 5-10 seconds
4. Verify changes appear on device B

## Troubleshooting

### Common Issues

#### "Account Not Available"
- Ensure device is signed into iCloud
- Check iCloud Drive is enabled in Settings
- Verify iCloud+ subscription is active

#### "Not Authenticated"
- Sign out and back into iCloud on device
- Check Apple Developer account status
- Verify provisioning profile includes CloudKit entitlement

#### Sync Not Working
- Check internet connection
- Force quit app and relaunch
- Check CloudKit Dashboard for errors
- Review Console logs for CloudKit errors

#### Schema Conflicts
- Delete app and reinstall (development only)
- Clear CloudKit development data in Dashboard
- Reset Development environment

### Debug CloudKit Issues

Enable CloudKit logging in Xcode:

1. **Edit Scheme** → **Run** → **Arguments**
2. Add Environment Variables:
   - `CLOUDKIT_LOGGING`: `1`
   - `CLOUDKIT_VERBOSE_LOGGING`: `1`
3. Check Console for detailed CloudKit logs

### CloudKit Dashboard Tools

- **Logs**: View sync activity and errors
- **Query**: Manually inspect stored records
- **Telemetry**: Monitor usage and performance

## Testing Checklist

- [ ] App launches successfully
- [ ] iCloud account detected
- [ ] Default subjects created
- [ ] Create material syncs to CloudKit
- [ ] Create flashcard syncs to CloudKit
- [ ] Create task syncs to CloudKit
- [ ] Changes sync between devices
- [ ] Offline changes sync when online
- [ ] User progress saves correctly

## Production Deployment

Before releasing to App Store:

1. Deploy CloudKit schema to production
2. Test with TestFlight build
3. Verify sync on production environment
4. Monitor CloudKit usage in Dashboard
5. Set up alerts for quota limits

## Resources

- [CloudKit Documentation](https://developer.apple.com/documentation/cloudkit)
- [SwiftData + CloudKit Guide](https://developer.apple.com/documentation/swiftdata/adding-cloudkit-to-an-app)
- [CloudKit Best Practices](https://developer.apple.com/videos/play/wwdc2021/10086/)
- [CloudKit Dashboard](https://icloud.developer.apple.com/dashboard/)

## Support

For CloudKit-related issues:

1. Check Console logs for error codes
2. Review CloudKit Dashboard logs
3. Consult Apple Developer Forums
4. Contact Apple Developer Support

---

**Last Updated**: October 12, 2025
**Version**: 1.0
**Author**: Development Team
