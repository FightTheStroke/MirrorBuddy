# MirrorBuddy - Google Cloud Setup Complete Guide

**Complete step-by-step guide to configure Google Drive, Gmail, and Calendar integration.**

---

## Table of Contents

1. [Create Google Cloud Project](#1-create-google-cloud-project)
2. [Enable Required APIs](#2-enable-required-apis)
3. [Create OAuth 2.0 Credentials](#3-create-oauth-20-credentials)
4. [Configure App](#4-configure-app)
5. [Test Integration](#5-test-integration)
6. [Troubleshooting](#6-troubleshooting)

---

## Prerequisites

- Apple Developer account (free tier is fine)
- Google account
- Xcode installed
- MirrorBuddy project cloned

---

## 1. Create Google Cloud Project

### Step 1.1: Go to Google Cloud Console

Open: https://console.cloud.google.com/

### Step 1.2: Create New Project

1. Click **"Select a project"** dropdown (top bar)
2. Click **"New Project"**
3. Enter project details:
   - **Project name**: `MirrorBuddy` (or your preferred name)
   - **Organization**: Leave as-is or select your organization
4. Click **"Create"**
5. Wait for project creation (takes ~30 seconds)
6. **Select the new project** from the dropdown

### Step 1.3: Note Your Project ID

- After creation, note the **Project ID** (e.g., `mirrorbuddy-123456`)
- You'll see it in the dashboard and project selector

---

## 2. Enable Required APIs

### Step 2.1: Go to API Library

Open: https://console.cloud.google.com/apis/library

**Make sure your MirrorBuddy project is selected** (check top bar).

### Step 2.2: Enable Google Drive API

1. Search for **"Google Drive API"**
2. Click on **Google Drive API** card
3. Click **"Enable"** button
4. Wait for confirmation: "API enabled"

Direct link: https://console.cloud.google.com/apis/library/drive.googleapis.com

### Step 2.3: Enable Gmail API

1. Go back to API Library
2. Search for **"Gmail API"**
3. Click on **Gmail API** card
4. Click **"Enable"** button
5. Wait for confirmation: "API enabled"

Direct link: https://console.cloud.google.com/apis/library/gmail.googleapis.com

### Step 2.4: Enable Google Calendar API

1. Go back to API Library
2. Search for **"Google Calendar API"**
3. Click on **Calendar API** card
4. Click **"Enable"** button
5. Wait for confirmation: "API enabled"

Direct link: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com

### Step 2.5: Verify APIs are Enabled

Go to: https://console.cloud.google.com/apis/dashboard

You should see:
- ✅ **Google Drive API**: Enabled
- ✅ **Gmail API**: Enabled
- ✅ **Google Calendar API**: Enabled

**Wait 1-2 minutes** for API enablement to propagate.

---

## 3. Create OAuth 2.0 Credentials

### Step 3.1: Go to Credentials Page

Open: https://console.cloud.google.com/apis/credentials

### Step 3.2: Configure OAuth Consent Screen (First Time Only)

If this is your first time creating OAuth credentials:

1. Click **"Configure Consent Screen"**
2. Choose **"External"** (allows any Google account)
3. Click **"Create"**
4. Fill in required fields:
   - **App name**: `MirrorBuddy`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **"Save and Continue"**
6. **Scopes**: Click "Add or Remove Scopes"
   - Search and add:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/drive.metadata.readonly`
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.events.readonly`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Click **"Update"**
7. Click **"Save and Continue"**
8. **Test users** (optional): Add your Google account for testing
9. Click **"Save and Continue"**
10. Review and click **"Back to Dashboard"**

### Step 3.3: Create OAuth Client ID

1. Go back to: https://console.cloud.google.com/apis/credentials
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: Select **"iOS"**
4. Enter details:
   - **Name**: `MirrorBuddy iOS`
   - **Bundle ID**: `com.mirror-labs.MirrorBuddy`
5. Click **"Create"**

### Step 3.4: Download Credentials

1. After creation, you'll see the OAuth client created
2. Click the **Download** button (download icon) next to your client ID
3. This downloads a `.plist` file with name like:
   ```
   client_XXXXX-YYYYY.apps.googleusercontent.com.plist
   ```
4. **Save this file** - you'll need it in the next step

**Alternative**: Click on the credential to view details and copy:
- **Client ID**: `809300652208-63bsk3kh9t668kpi5j8vcbnssnggualk.apps.googleusercontent.com`
- **Note the reversed client ID** (shown in details)

---

## 4. Configure App

### Step 4.1: Add GoogleService-Info.plist to Project

1. Locate the downloaded `.plist` file from Step 3.4
2. Rename it to: `GoogleService-Info.plist`
3. Copy it to:
   ```
   MirrorBuddy/Resources/GoogleService-Info.plist
   ```

**Command line**:
```bash
cp ~/Downloads/client_XXXXX-YYYYY.apps.googleusercontent.com.plist \
   /path/to/MirrorBuddy/MirrorBuddy/Resources/GoogleService-Info.plist
```

### Step 4.2: Verify Info.plist URL Scheme

The app's `Info.plist` should already have the correct URL scheme configured.

Verify in: `MirrorBuddy/Info.plist`

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.809300652208-63bsk3kh9t668kpi5j8vcbnssnggualk</string>
        </array>
    </dict>
</array>
```

**If you have a different Client ID**, update this line with your reversed client ID.

### Step 4.3: Verify GoogleService-Info.plist Contents

Open the plist file and verify it contains:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CLIENT_ID</key>
    <string>809300652208-63bsk3kh9t668kpi5j8vcbnssnggualk.apps.googleusercontent.com</string>
    <key>REVERSED_CLIENT_ID</key>
    <string>com.googleusercontent.apps.809300652208-63bsk3kh9t668kpi5j8vcbnssnggualk</string>
    <key>BUNDLE_ID</key>
    <string>com.mirror-labs.MirrorBuddy</string>
</dict>
</plist>
```

### Step 4.4: Build and Run

1. Open `MirrorBuddy.xcodeproj` in Xcode
2. Select your device or simulator
3. **Clean Build Folder**: Product → Clean Build Folder (Cmd+Shift+K)
4. **Build**: Product → Build (Cmd+B)
5. **Run**: Product → Run (Cmd+R)

---

## 5. Test Integration

### Step 5.1: Test Google Drive Authentication

1. Launch the app
2. Go to **Settings** tab
3. Find and tap **"Connect Google Drive"** (or similar)
4. Tap **"Sign in with Google"** button
5. Safari/browser should open with Google sign-in page
6. Sign in with your Google account
7. **Grant permissions** when prompted:
   - Access to Google Drive
   - Access to Gmail
   - Access to Calendar
8. You should be redirected back to the app
9. Connection status should show **"Connected"**

### Step 5.2: Verify Logs

Check Xcode console for successful authentication:

```
[GoogleOAuthService] Authentication successful
[GoogleOAuthService] Tokens saved to Keychain
Gmail service configured
Google Calendar service configured
```

### Step 5.3: Test Drive File Access

1. In the app, try to access Google Drive files
2. Files should load without 403 errors
3. Check console for successful API calls:
   ```
   [DriveClient] Fetching files from Google Drive
   [DriveClient] Found X files
   ```

---

## 6. Troubleshooting

### Issue: "API has not been used in project" (403 Error)

**Cause**: APIs not enabled in Google Cloud Console

**Solution**:
1. Go to https://console.cloud.google.com/apis/dashboard
2. Verify all 3 APIs are enabled (Drive, Gmail, Calendar)
3. If not, enable them (see Step 2)
4. Wait 1-2 minutes for propagation
5. Rebuild and retry

### Issue: "redirect_uri_mismatch" Error

**Cause**: URL scheme in Info.plist doesn't match OAuth client configuration

**Solution**:
1. Check `REVERSED_CLIENT_ID` in `GoogleService-Info.plist`
2. Verify it matches the URL scheme in `Info.plist`
3. Format should be: `com.googleusercontent.apps.YOUR_CLIENT_ID_HERE`

### Issue: "invalid_client" Error

**Cause**: Client ID mismatch or wrong credentials file

**Solution**:
1. Delete `MirrorBuddy/Resources/GoogleService-Info.plist`
2. Re-download from Google Cloud Console (Step 3.4)
3. Copy to project
4. Clean build and retry

### Issue: App Doesn't Open After OAuth

**Cause**: URL scheme not registered or wrong

**Solution**:
1. Verify `CFBundleURLSchemes` in `Info.plist`
2. Should match `REVERSED_CLIENT_ID` from plist
3. Clean build (Cmd+Shift+K) and rebuild

### Issue: "User cancelled" or Nothing Happens

**Cause**: Safari restrictions or network issues

**Solution**:
1. Check internet connection
2. Try Safari → Clear History and Website Data
3. Restart device/simulator
4. Try authentication again

### Issue: Credentials Accidentally Committed to Git

**Cause**: `.gitignore` not working or force-added

**Solution**:
1. **Remove from Git** (keep local copy):
   ```bash
   git rm --cached MirrorBuddy/Resources/GoogleService-Info.plist
   git commit -m "Remove credentials from Git"
   git push
   ```
2. Verify `.gitignore` contains:
   ```
   # Google OAuth credentials
   MirrorBuddy/Resources/GoogleService-Info.plist
   ```
3. **Regenerate credentials** on Google Cloud Console for security

---

## Security Best Practices

### ✅ DO:
- ✅ Keep `GoogleService-Info.plist` in `.gitignore`
- ✅ Never commit OAuth credentials to Git
- ✅ Use environment variables for CI/CD
- ✅ Regenerate credentials if accidentally exposed
- ✅ Restrict API scopes to minimum needed

### ❌ DON'T:
- ❌ Don't share `GoogleService-Info.plist` publicly
- ❌ Don't commit credentials to Git
- ❌ Don't use production credentials for development
- ❌ Don't grant unnecessary API scopes

---

## Files Reference

### Important Files in Project

| File | Purpose | Committed to Git? |
|------|---------|-------------------|
| `GoogleService-Info.plist` | Your OAuth credentials | ❌ NO (in .gitignore) |
| `GoogleService-Info.plist.example` | Template for credentials | ✅ YES |
| `GoogleOAuthConfig.swift` | Loads credentials at runtime | ✅ YES |
| `GoogleOAuthService.swift` | Handles OAuth flow | ✅ YES |
| `Info.plist` | App URL schemes | ✅ YES |
| `.gitignore` | Protects credentials | ✅ YES |

### Configuration Checklist

Before deploying:

- [ ] Google Cloud project created
- [ ] All 3 APIs enabled (Drive, Gmail, Calendar)
- [ ] OAuth consent screen configured
- [ ] OAuth Client ID created for iOS
- [ ] `GoogleService-Info.plist` downloaded and added to project
- [ ] `Info.plist` URL scheme matches credentials
- [ ] `.gitignore` includes `GoogleService-Info.plist`
- [ ] Build succeeds
- [ ] Authentication tested and working
- [ ] Drive/Gmail/Calendar APIs working

---

## Support

### Useful Links

- **Google Cloud Console**: https://console.cloud.google.com/
- **API Dashboard**: https://console.cloud.google.com/apis/dashboard
- **Credentials**: https://console.cloud.google.com/apis/credentials
- **OAuth Consent Screen**: https://console.cloud.google.com/apis/credentials/consent
- **API Library**: https://console.cloud.google.com/apis/library

### Documentation

- **Google OAuth 2.0**: https://developers.google.com/identity/protocols/oauth2
- **Google Drive API**: https://developers.google.com/drive/api/guides/about-sdk
- **Gmail API**: https://developers.google.com/gmail/api/guides
- **Calendar API**: https://developers.google.com/calendar/api/guides/overview

---

## Change Log

### When to Update Configuration

You need to update Google configuration when:

1. **Creating new OAuth credentials**:
   - Download new plist
   - Replace `GoogleService-Info.plist`
   - Update `Info.plist` if client ID changed

2. **Adding/removing API scopes**:
   - Update OAuth consent screen in Google Cloud Console
   - Update scopes in `GoogleOAuthConfig.swift` if needed

3. **Changing bundle ID**:
   - Create new OAuth client ID with new bundle ID
   - Update app configuration

4. **Rotating credentials** (security):
   - Delete old OAuth client ID in Google Cloud Console
   - Create new OAuth client ID
   - Download new plist and replace in project

---

**Last Updated**: October 2025
**App Version**: 1.0
**Maintained By**: MirrorBuddy Development Team
