# MirrorBuddy Deployment Guide

Complete guide for deploying MirrorBuddy to TestFlight and the App Store.

## Table of Contents

1. [Code Signing Requirements](#code-signing-requirements)
2. [App Store Connect Setup](#app-store-connect-setup)
3. [TestFlight Distribution](#testflight-distribution)
4. [App Store Submission](#app-store-submission)
5. [Release Checklist](#release-checklist)
6. [App Store Screenshots](#app-store-screenshots)
7. [Privacy Policy Requirements](#privacy-policy-requirements)
8. [Marketing Materials](#marketing-materials)

---

## Code Signing Requirements

### Prerequisites

- **Apple Developer Account** (Individual or Organization)
  - Sign up at [developer.apple.com](https://developer.apple.com)
  - $99/year membership required

- **Xcode** (latest stable version)
  - Download from Mac App Store or [developer.apple.com](https://developer.apple.com/xcode/)

- **Mac** running macOS Sonoma (14.0) or later

### Certificate Setup

#### 1. Create Distribution Certificate

**Via Xcode (Recommended)**:
1. Open Xcode → **Settings** (⌘,)
2. Select **Accounts** tab
3. Add your Apple ID if not present
4. Select your team → Click **Manage Certificates...**
5. Click **+** → **Apple Distribution**
6. Xcode automatically creates and downloads the certificate

**Via Developer Portal (Manual)**:
1. Go to [developer.apple.com/account/resources/certificates](https://developer.apple.com/account/resources/certificates)
2. Click **+** to create new certificate
3. Select **Apple Distribution**
4. Upload Certificate Signing Request (CSR):
   - Open **Keychain Access** → **Certificate Assistant** → **Request a Certificate**
   - Enter email, select "Saved to disk"
   - Upload the `.certSigningRequest` file
5. Download and install certificate

#### 2. Register App ID

1. Go to [Identifiers](https://developer.apple.com/account/resources/identifiers)
2. Click **+** → **App IDs** → **App**
3. Enter details:
   - **Description**: MirrorBuddy
   - **Bundle ID**: `com.yourdomain.mirrorbuddy` (must match Xcode)
   - **Capabilities**: Enable required capabilities:
     - Push Notifications
     - iCloud (CloudKit)
     - In-App Purchase (if applicable)
     - Sign in with Apple (if used)
     - Speech Recognition
     - Camera
4. Click **Continue** → **Register**

#### 3. Create Provisioning Profiles

**App Store Distribution Profile**:
1. Go to [Profiles](https://developer.apple.com/account/resources/profiles)
2. Click **+** → **App Store**
3. Select **MirrorBuddy** App ID
4. Select **Distribution Certificate** created earlier
5. Name it: "MirrorBuddy App Store"
6. Download and double-click to install

**Development Profile** (for device testing):
1. Create profile with type **Development**
2. Select devices for testing
3. Install in Xcode

### Xcode Project Configuration

#### Update Signing Settings

1. Open `MirrorBuddy.xcodeproj` in Xcode
2. Select project in navigator → **MirrorBuddy** target
3. Go to **Signing & Capabilities** tab
4. **Automatically manage signing**: ✅ (recommended)
   - Select your **Team**
   - Xcode handles profiles automatically

   OR

   **Manually manage signing**: (advanced)
   - Uncheck automatic signing
   - Select provisioning profiles for Debug/Release

#### Update Build Settings

1. **Product Bundle Identifier**: `com.yourdomain.mirrorbuddy`
2. **Version**: Set to release version (e.g., `1.0`)
3. **Build**: Increment for each upload (e.g., `1`, `2`, `3`)

#### Configure Info.plist Permissions

Ensure all required permission descriptions are set:

```xml
<key>NSCameraUsageDescription</key>
<string>MirrorBuddy uses the camera to scan study materials and analyze images for learning assistance.</string>

<key>NSMicrophoneUsageDescription</key>
<string>MirrorBuddy uses the microphone for voice commands and interactive study coaching.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>MirrorBuddy accesses your photo library to import study materials and save scanned content.</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>MirrorBuddy uses speech recognition to understand your voice commands and provide interactive tutoring.</string>
```

---

## App Store Connect Setup

### Create App Record

1. **Sign in to App Store Connect**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Use your Apple Developer account

2. **Create New App**
   - Go to **My Apps** → Click **+** → **New App**
   - Fill in details:
     - **Platforms**: iOS
     - **Name**: MirrorBuddy
     - **Primary Language**: Italian or English
     - **Bundle ID**: Select `com.yourdomain.mirrorbuddy`
     - **SKU**: `MIRRORBUDDY001` (unique identifier for your records)
     - **User Access**: Full Access

3. **App Information**
   - **Category**: Education
   - **Secondary Category** (optional): Productivity
   - **Content Rights**: Check if contains third-party content

### Configure App Metadata

#### Localizations

Set up for each supported language (Italian, English):

**App Name**: MirrorBuddy

**Subtitle** (30 chars max):
- _English_: "AI-Powered Study Assistant"
- _Italian_: "Assistente Studio con AI"

**Promotional Text** (170 chars, updateable without new version):
```
Study smarter with AI coaching! Voice commands, instant explanations, mind maps, and personalized learning paths for Math, Italian, History, Science, and English.
```

**Description**:
```
MirrorBuddy is your personal AI-powered study assistant designed for students who want to learn more effectively and enjoyably.

KEY FEATURES:

🎙️ VOICE COACHING
- Interactive voice commands in Italian and English
- Ask questions and get instant explanations
- Hands-free studying while doing other activities

📚 SMART MATERIAL MANAGEMENT
- Scan textbooks, notes, and worksheets with your camera
- Auto-organize by subject and difficulty
- Search materials using natural language

🧠 MIND MAPS & VISUALIZATION
- Auto-generate visual concept maps
- Navigate complex topics with interactive diagrams
- AI-suggested connections between ideas

📸 VISION ANALYSIS
- Scan math problems for step-by-step solutions
- Extract text from handwritten notes
- Analyze diagrams and graphs

✅ TASK & STUDY TRACKING
- Create tasks via voice or manual entry
- Track study streaks and progress
- Sync with school LMS platforms

🎯 GAMIFICATION
- Earn XP and unlock achievements
- Build study streaks for motivation
- Weekly challenges and leaderboards

📊 SUBJECT-SPECIFIC MODES
- Math: Problem solver, graph renderer, formula library
- Italian: Grammar help, verb conjugations, literature summaries
- History: Timelines, character profiles, event maps
- Science: Experiment simulator, formula explainer, unit converter
- Language: Grammar checker, pronunciation coach

🔒 PRIVACY-FIRST
- All data encrypted end-to-end
- No ads, no data selling
- Full control over your information

PERFECT FOR:
- Middle and high school students
- Self-learners and homeschoolers
- Students preparing for exams
- Anyone wanting to study smarter, not harder

SUPPORTED LANGUAGES:
- Full bilingual support (Italian/English)
- Voice commands in both languages

REQUIREMENTS:
- iOS 16.0 or later
- Compatible with iPhone and iPad
- Internet connection for AI features (offline mode available)

Download MirrorBuddy today and transform your study experience!
```

**Keywords** (100 chars max, comma-separated):
```
study, AI, education, tutor, flashcards, mind map, voice, math, Italian, homework, school, learning
```

**Support URL**: https://yourwebsite.com/support
**Marketing URL**: https://yourwebsite.com
**Privacy Policy URL**: https://yourwebsite.com/privacy

#### Pricing and Availability

- **Price**: Free (or select tier if paid)
- **Availability**: All territories (or select specific countries)
- **Pre-orders**: Optional

#### In-App Purchases (if applicable)

Set up IAP for premium features:
1. Go to **Features** → **In-App Purchases**
2. Click **+** to add:
   - **Premium Monthly**: Auto-renewable subscription
   - **Premium Yearly**: Auto-renewable subscription
3. Configure pricing, descriptions, and localized content

#### App Privacy

Configure data collection details:
1. Go to **App Privacy** section
2. Click **Get Started**
3. Answer questions about:
   - Data collected (usage data, contact info, etc.)
   - Data linked to user
   - Tracking practices
4. Publish privacy details

---

## TestFlight Distribution

### Prepare Build for TestFlight

#### 1. Archive the App

1. In Xcode, select target device: **Any iOS Device (arm64)**
2. **Product** → **Archive**
3. Wait for archive to complete (may take several minutes)
4. **Organizer** window opens automatically

#### 2. Validate Archive

Before uploading:
1. Select archive → Click **Validate App**
2. Choose distribution method: **App Store Connect**
3. Select provisioning: **Automatically manage signing** (recommended)
4. Review validation:
   - Code signing
   - Entitlements
   - Binary compatibility
5. Fix any issues and re-archive if needed

#### 3. Upload to App Store Connect

1. Click **Distribute App**
2. Select: **App Store Connect**
3. Choose upload method: **Upload**
4. Select provisioning: **Automatically manage signing**
5. Review `MirrorBuddy.ipa` details
6. Click **Upload**
7. Wait for upload to complete

**Command Line Alternative** (using `xcrun`):
```bash
xcrun altool --upload-app \
  --type ios \
  --file "MirrorBuddy.ipa" \
  --apiKey YOUR_API_KEY \
  --apiIssuer YOUR_ISSUER_ID
```

### Configure TestFlight

#### 1. Build Processing

After upload:
1. Go to **App Store Connect** → **TestFlight**
2. Wait for build to process (10-60 minutes)
3. Check for email: "Your build has been processed"

#### 2. Provide Export Compliance

When build is ready:
1. Answer export compliance questions:
   - Does app use encryption? (Yes, for data protection)
   - Is encryption standard? (Yes, uses standard iOS encryption)
2. Submit responses

#### 3. Test Information

Add beta app information:

**What to Test**:
```
Please test the following key features:
- Voice command accuracy and responsiveness
- Material scanning and OCR quality
- AI explanations and tutoring
- Mind map navigation and interactions
- Task management and synchronization
- Offline functionality

Known Issues:
- [List any known issues or limitations]

Feedback Focus:
- User interface intuitiveness
- Voice command natural language understanding
- Study workflow effectiveness
```

**Beta App Description**:
```
AI-powered study assistant for students. Test voice coaching, material scanning, mind maps, and personalized learning features.
```

**Feedback Email**: beta@yourcompany.com

#### 4. Add Testers

**Internal Testing** (up to 100 Apple Developer team members):
1. Go to **Internal Testing**
2. Click **+** next to **Testers**
3. Add team members by email
4. Distribute build to testers

**External Testing** (up to 10,000 external testers):
1. Go to **External Testing**
2. Create test group: "Beta Users"
3. Add testers manually or via public link
4. Submit for Beta App Review (required for external testers)
5. Wait for approval (usually 24-48 hours)

#### 5. Collect Feedback

- Monitor **TestFlight Feedback** in App Store Connect
- Review crash logs and diagnostics
- Iterate based on tester feedback

---

## App Store Submission

### Pre-Submission Checklist

Before submitting to App Store:

- [ ] All features fully implemented and tested
- [ ] No crashes or critical bugs
- [ ] TestFlight beta testing completed
- [ ] App Store screenshots prepared (all required sizes)
- [ ] App Preview video created (optional but recommended)
- [ ] Privacy Policy published and URL accessible
- [ ] Support website live
- [ ] App Store description finalized
- [ ] Keywords optimized for SEO
- [ ] Age rating determined
- [ ] Export compliance answered
- [ ] All required legal documents ready

### Submit for Review

#### 1. Prepare Version for Release

1. Go to **App Store Connect** → **My Apps** → **MirrorBuddy**
2. Click **+** next to **iOS App** → **Version** or **Platform Version**
3. Enter version number (e.g., `1.0`)

#### 2. Select Build

1. Under **Build**, click **+**
2. Select processed build from TestFlight
3. Add build to version

#### 3. Complete App Information

**Version Information**:
- **What's New in This Version**: Describe new features/changes
  ```
  Welcome to MirrorBuddy 1.0!

  • AI-powered voice coaching in Italian and English
  • Smart material scanning with OCR
  • Interactive mind maps for visual learning
  • Subject-specific study modes (Math, Italian, History, Science, English)
  • Gamification with streaks, badges, and XP
  • Task management with LMS integration

  Start studying smarter today!
  ```

**Rating**:
- Complete **Age Rating** questionnaire
- MirrorBuddy: Likely **4+** (educational content, no mature themes)

#### 4. Add Screenshots

Upload screenshots for all required device sizes (see Screenshots section below).

#### 5. App Review Information

**Contact Information**:
- First Name: [Your name]
- Last Name: [Your surname]
- Phone Number: [Your phone]
- Email: review@yourcompany.com

**Demo Account** (if app requires login):
- Username: demo@mirrorbuddy.app
- Password: [secure demo password]
- Notes: "Demo account with sample study materials pre-loaded"

**Notes**:
```
MirrorBuddy is an educational AI assistant for students.

Key testing points:
- Voice commands work in Italian and English
- Camera permission required for material scanning
- Microphone permission for voice coaching
- Offline mode available for core features

No demo account needed - app works without login.
```

**Attachments**: Add demo video if complex functionality

#### 6. Version Release

Choose release strategy:
- **Manual release**: You control when app goes live after approval
- **Automatic release**: Goes live immediately upon approval
- **Scheduled release**: Set specific date/time

#### 7. Submit for Review

1. Review all information
2. Click **Add for Review** (top right)
3. Click **Submit to App Review**
4. Confirm submission

### Review Process

**Timeline**:
- Initial review: 24-48 hours (can be up to 7 days)
- Re-submissions after rejection: Usually faster

**Possible Outcomes**:

1. **Approved** ✅
   - App goes live based on release settings
   - Celebrate! 🎉

2. **Rejected** ❌
   - Review rejection reasons in **Resolution Center**
   - Common issues:
     - Missing privacy explanations
     - Crashes during review
     - Guideline violations
     - Incomplete functionality
   - Fix issues and resubmit

3. **Metadata Rejected**
   - Only app info rejected (not binary)
   - Update metadata and resubmit

4. **Waiting for Developer Release**
   - Approved, waiting for your manual release

### Post-Approval

1. **Release Notes**: Update version notes if needed
2. **Monitor**: Watch for crash reports and reviews
3. **Respond to Reviews**: Engage with users
4. **Plan Updates**: Iterate based on feedback

---

## Release Checklist

Use this checklist before every release:

### Code Quality
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All UI tests passing
- [ ] No compiler warnings
- [ ] Code reviewed by team
- [ ] SwiftLint issues resolved
- [ ] Memory leaks checked with Instruments
- [ ] Performance profiled (Time Profiler)

### Functionality
- [ ] All features working as expected
- [ ] Offline mode tested
- [ ] iCloud sync verified
- [ ] Voice commands tested on real device
- [ ] Camera/vision scanning works correctly
- [ ] In-app purchases functional (if applicable)
- [ ] Push notifications working
- [ ] Deep links functional

### Content
- [ ] No placeholder text or images
- [ ] All strings localized (Italian/English)
- [ ] Legal text up to date (Terms, Privacy Policy)
- [ ] Help content complete
- [ ] Tutorial/onboarding polished

### Metadata & Assets
- [ ] Version number incremented correctly
- [ ] Build number incremented
- [ ] Bundle identifier correct
- [ ] App icon updated (if changed)
- [ ] Launch screen finalized
- [ ] All screenshot sizes prepared
- [ ] App Preview video uploaded (optional)
- [ ] Keywords optimized
- [ ] Description proofread

### Legal & Compliance
- [ ] Privacy Policy reviewed and current
- [ ] Terms of Service updated
- [ ] Age rating accurate
- [ ] Export compliance answered correctly
- [ ] Copyright notices in place
- [ ] Third-party licenses documented

### Testing
- [ ] Tested on multiple iOS versions (16, 17, 18)
- [ ] Tested on iPhone (mini, standard, Pro, Pro Max)
- [ ] Tested on iPad (standard, Air, Pro)
- [ ] Tested with VoiceOver enabled
- [ ] Tested with Dynamic Type (large text)
- [ ] Tested in Airplane Mode
- [ ] TestFlight beta completed

### Backend & Services
- [ ] API servers stable and scaled
- [ ] Database backups verified
- [ ] CDN configured correctly
- [ ] Monitoring alerts set up
- [ ] Rate limiting in place
- [ ] Error tracking configured (e.g., Sentry)

### Communication
- [ ] Release notes drafted
- [ ] Marketing materials ready
- [ ] Social media posts scheduled
- [ ] Email announcement prepared
- [ ] Support team briefed on new features
- [ ] FAQ updated

### Post-Release
- [ ] Monitor crash reports
- [ ] Watch App Store reviews
- [ ] Track analytics and user engagement
- [ ] Prepare hotfix process if needed

---

## App Store Screenshots

### Required Sizes

App Store requires screenshots for different device sizes:

**iPhone**:
- 6.7" (iPhone 15 Pro Max, 14 Pro Max): 1290 x 2796 pixels
- 6.5" (iPhone 11 Pro Max, XS Max): 1284 x 2778 pixels
- 5.5" (iPhone 8 Plus): 1242 x 2208 pixels

**iPad**:
- 12.9" (iPad Pro 12.9"): 2048 x 2732 pixels
- 11" (iPad Pro 11"): 1668 x 2388 pixels

**Minimum Requirements**:
- At least 3 screenshots, up to 10
- Same number of screenshots across all localizations
- PNG or JPEG format
- RGB color space

### Screenshot Guidelines

**Content**:
1. **Home Dashboard**: Show study stats, today's tasks, streaks
2. **Material Browsing**: Display material cards with search
3. **Voice Command**: Show voice interface with examples
4. **Mind Map**: Interactive mind map with navigation
5. **Vision Scanning**: Camera view scanning a textbook
6. **Flashcard Study**: Flashcard interface with coaching
7. **Progress & Gamification**: Badges, XP, achievements

**Design Tips**:
- Use device frames for polished look
- Add text overlays explaining features
- Maintain consistent color scheme
- Highlight key UI elements
- Show actual app functionality (no mockups)
- Use localized content for each language

**Tools**:
- **Simulator**: Take screenshots in Xcode simulator
- **Screenshot** (⌘⇧5): Native macOS tool
- **Fastlane Snapshot**: Automated screenshot generation
- **Design Tools**: Figma, Sketch for frames and annotations

### Creating Screenshots

**Using Xcode Simulator**:
1. Run app on desired simulator size
2. Navigate to screenshot view
3. **Device** → **Capture Screen** (⌘S)
4. Screenshots saved to Desktop

**Using Fastlane (Automated)**:
```bash
fastlane snapshot
```

Create `Snapfile`:
```ruby
devices([
  "iPhone 15 Pro Max",
  "iPhone 15",
  "iPad Pro (12.9-inch) (6th generation)"
])

languages([
  "en-US",
  "it-IT"
])

clear_previous_screenshots(true)
```

---

## Privacy Policy Requirements

App Store requires a privacy policy accessible via URL.

### Privacy Policy Template

```markdown
# Privacy Policy for MirrorBuddy

**Effective Date**: [Date]

## Introduction

MirrorBuddy ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.

## Information We Collect

### Information You Provide
- **Account Information**: Name, email address (if registration required)
- **Study Materials**: Text, images, notes you upload or scan
- **Voice Data**: Voice commands for processing (not stored permanently)
- **Tasks and Notes**: Study tasks and personal notes you create

### Automatically Collected Information
- **Usage Data**: Features used, session duration, crash logs
- **Device Information**: Device model, OS version, unique identifiers
- **Camera and Microphone**: Only when actively using scanning or voice features

## How We Use Your Information

- **Provide Services**: Process voice commands, analyze images, generate mind maps
- **AI Improvement**: Improve AI accuracy and responsiveness (anonymized data only)
- **Personalization**: Customize study recommendations and difficulty levels
- **Communication**: Send updates, notifications, and support responses
- **Analytics**: Understand usage patterns to improve the app

## Data Storage and Security

- **Encryption**: All data encrypted in transit (TLS) and at rest (AES-256)
- **iCloud**: Study materials synced via your personal iCloud account (you control this data)
- **Servers**: AI processing may use cloud servers (AWS/Azure) in [region]
- **Retention**: Data kept as long as account is active; deleted upon request

## Data Sharing

We do not sell, rent, or share your personal data with third parties, except:
- **Service Providers**: Cloud hosting (AWS), analytics (optional)
- **Legal Requirements**: If required by law or to protect rights
- **With Your Consent**: When you explicitly authorize sharing

## Your Rights

- **Access**: Request copy of your data
- **Deletion**: Request deletion of your account and data
- **Correction**: Update inaccurate information
- **Opt-Out**: Disable analytics and non-essential data collection
- **Export**: Download your study materials

## Children's Privacy

MirrorBuddy is suitable for users 13+ (or 4+ with parental supervision). We do not knowingly collect personal information from children under 13 without parental consent.

## Third-Party Services

MirrorBuddy may integrate with:
- **Apple iCloud**: For data synchronization
- **OpenAI/Google AI**: For natural language processing
- **Analytics Services**: For app usage insights (opt-in)

## Changes to This Policy

We may update this policy periodically. Continued use after changes constitutes acceptance.

## Contact Us

For privacy questions or requests:
- Email: privacy@yourcompany.com
- Website: https://yourwebsite.com/privacy

## GDPR Compliance (For EU Users)

If you are in the European Union, you have additional rights under GDPR, including the right to data portability and the right to lodge a complaint with a supervisory authority.

---

**Last Updated**: [Date]
```

### Publishing Privacy Policy

Host policy on:
- Your official website (e.g., `https://yourwebsite.com/privacy`)
- OR use a privacy policy generator service (e.g., PrivacyPolicies.com, Termly)
- Ensure URL is publicly accessible (no authentication required)
- Include link in App Store Connect metadata

---

## Marketing Materials

### App Preview Video (Optional but Recommended)

**Specifications**:
- Length: 15-30 seconds (max 30 seconds for App Store)
- Format: M4V, MP4, or MOV
- Resolution: Match screenshot sizes
- Orientation: Portrait or landscape (consistent with app)

**Content Structure**:
1. **Hook** (0-3s): Grab attention with key benefit
   - "Study smarter with AI coaching"
2. **Features** (3-20s): Show 3-5 core features
   - Voice commands
   - Material scanning
   - Mind maps
   - Gamification
3. **Call to Action** (20-30s): Encourage download
   - "Download MirrorBuddy today!"

**Tips**:
- Use actual app footage (screen recordings)
- Add background music (ensure you have rights)
- Include text overlays for clarity
- No external branding or watermarks
- Preview on device before uploading

### Promotional Assets

**App Icon**:
- 1024 x 1024 px
- No transparency
- Recognizable at small sizes
- Consistent with brand

**Social Media Graphics**:
- Facebook: 1200 x 630 px
- Twitter: 1200 x 675 px
- Instagram: 1080 x 1080 px

**Website Assets**:
- Hero image: 1920 x 1080 px
- Feature screenshots: Formatted with device frames

### Press Kit

Create a press kit with:
- App description (short, medium, long versions)
- High-resolution app icon
- Screenshots (all sizes)
- App Preview video
- Founder/team bios
- Company logo
- Contact information

Host at: `https://yourwebsite.com/press`

---

## Continuous Deployment (Advanced)

### Fastlane Setup

Automate builds and uploads with Fastlane:

**Install Fastlane**:
```bash
sudo gem install fastlane -NV
cd /path/to/MirrorBuddy
fastlane init
```

**Configure `Fastfile`**:
```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    increment_build_number
    build_app(scheme: "MirrorBuddy")
    upload_to_testflight(skip_waiting_for_build_processing: true)
    slack(message: "New beta build uploaded! 🚀")
  end

  desc "Build and upload to App Store"
  lane :release do
    increment_build_number
    build_app(scheme: "MirrorBuddy")
    upload_to_app_store(
      submit_for_review: false,
      automatic_release: false
    )
  end
end
```

**Deploy to TestFlight**:
```bash
fastlane beta
```

### GitHub Actions CI/CD

Automate on every push:

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to TestFlight

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Fastlane
        run: gem install fastlane
      - name: Build and upload
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
        run: fastlane beta
```

---

## Support and Resources

- **Apple Developer Documentation**: [developer.apple.com/documentation](https://developer.apple.com/documentation)
- **App Store Review Guidelines**: [developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **TestFlight Documentation**: [developer.apple.com/testflight](https://developer.apple.com/testflight/)
- **Fastlane**: [fastlane.tools](https://fastlane.tools)

---

**Happy Deploying! 🚀**
