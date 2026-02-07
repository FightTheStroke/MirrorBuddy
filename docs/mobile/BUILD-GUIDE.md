# MirrorBuddy Mobile Build Guide

**App ID**: `org.fightthestroke.mirrorbuddy` | **Framework**: Next.js + Capacitor 8.x

## 1. Prerequisites

**Common**: Node.js 20+, npm 10+, Capacitor CLI (`npm i -g @capacitor/cli`)

**iOS**: macOS, Xcode 15+, CocoaPods (`sudo gem install cocoapods`), Apple Developer Account

**Android**: Android Studio Hedgehog+, JDK 17, Android SDK API 33+, Emulator via AVD Manager

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

## 2. First-Time Setup

```bash
npm install && npx cap sync && npx cap doctor

# iOS: Install CocoaPods
cd ios/App && pod install && cd ../..
npx cap doctor ios

# Android: Open Android Studio (auto-syncs Gradle, ~5-10 min first run)
npx cap open android
npx cap doctor android
```

## 3. Development Build (iOS)

```bash
npm run build:mobile:web && npx cap copy ios
npx cap open ios  # In Xcode: select simulator, press ⌘+R
```

**Live Reload**: Run `npm run dev`, edit `capacitor.config.ts` to add `server: { url: 'http://localhost:3000', cleartext: true }`, then open Xcode. Revert config before production.

## 4. Development Build (Android)

```bash
npm run build:mobile:web && npx cap copy android
npx cap open android  # In Android Studio: select emulator, click Run (Shift+F10)
```

**Live Reload**: Same as iOS - run `npm run dev`, update config, run via Android Studio.

## 5. Release Build (iOS)

**Signing Setup**:

1. Enroll at [developer.apple.com](https://developer.apple.com), add certificates in Xcode (Preferences > Accounts)
2. Register `org.fightthestroke.mirrorbuddy` in Apple Developer Portal, enable Push Notifications
3. Create Distribution profile, download and install (.mobileprovision)

**Manual Archive**:

```bash
npm run build:mobile:web && npx cap copy ios && npx cap sync ios
npx cap open ios
# Xcode: Select "Any iOS Device (arm64)" > Product > Archive > Distribute App > App Store Connect
```

**Fastlane** (automated):

```bash
sudo gem install fastlane && cd ios && fastlane init
fastlane beta  # TestFlight
fastlane release  # App Store
```

## 6. Release Build (Android)

**Keystore Generation**:

```bash
keytool -genkey -v -keystore mirrorbuddy-release.keystore -alias mirrorbuddy -keyalg RSA -keysize 2048 -validity 10000
mv mirrorbuddy-release.keystore ~/keys/
cat > android/key.properties << EOF
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=mirrorbuddy
storeFile=/Users/YOUR_USERNAME/keys/mirrorbuddy-release.keystore
EOF
echo "android/key.properties" >> .gitignore
```

**Manual Build**:

```bash
npm run build:mobile:web && npx cap copy android && npx cap sync android
npx cap open android
# Android Studio: Build > Generate Signed Bundle/APK > AAB/APK > select keystore > release variant
# Output: android/app/release/app-release.aab
```

**Fastlane** (automated):

```bash
sudo gem install fastlane && cd android && fastlane init
fastlane beta  # Play Console
fastlane release  # Production
```

## 7. Push Notification Setup

**Firebase Project**:

1. Visit [console.firebase.google.com](https://console.firebase.google.com), create "MirrorBuddy"
2. Add Android app (`org.fightthestroke.mirrorbuddy`), download `google-services.json` to `android/app/`
3. Add iOS app (`org.fightthestroke.mirrorbuddy`), download `GoogleService-Info.plist` to `ios/App/App/`

**APNs Certificate (iOS)**: Create in Apple Developer Portal, download .p12, upload to Firebase Console (Project Settings > Cloud Messaging > iOS app)

**Environment Variables** (`.env.local`):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mirrorbuddy
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Test**: Firebase Console > Cloud Messaging > Send test message (use device token from app logs)

## 8. Troubleshooting FAQ

**"webDir not found"**: Verify `capacitor.config.ts` has `webDir: "out"`, run `npm run build:mobile:web`

**"pod install" fails**:

```bash
cd ios/App && rm -rf Pods Podfile.lock && pod repo update && pod install --repo-update && cd ../..
```

**Gradle sync fails**: Verify JDK 17 (`java -version`), then:

```bash
cd android && ./gradlew clean && rm -rf .gradle build app/build && ./gradlew build
```

**iOS signing errors**: Xcode > project > Signing & Capabilities > check "Automatically manage signing" or manually select provisioning profile

**Android signing errors**: Verify `android/key.properties` path and test keystore:

```bash
keytool -list -v -keystore ~/keys/mirrorbuddy-release.keystore
```

**iOS app crashes**: Add to `ios/App/App/Info.plist`: NSCameraUsageDescription, NSMicrophoneUsageDescription, NSPhotoLibraryUsageDescription

**Android app crashes**: Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

---

**Help**: [Capacitor docs](https://capacitorjs.com/docs) or GitHub issues
