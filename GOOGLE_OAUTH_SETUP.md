# Google OAuth 2.0 Setup Guide for MirrorBuddy

This guide walks through setting up Google OAuth 2.0 for Google Drive integration in MirrorBuddy.

## Prerequisites

- Google Account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown (top navigation bar)
3. Click "New Project"
4. Enter project details:
   - **Project Name**: `MirrorBuddy` (or your preferred name)
   - **Organization**: (Optional) Select if applicable
   - **Location**: (Optional) Select if applicable
5. Click "Create"
6. Wait for project creation to complete
7. Select your new project from the project dropdown

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click on "Google Drive API"
4. Click "Enable"
5. Wait for the API to be enabled

## Step 3: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Select **User Type**:
   - Choose "External" for general users
   - Choose "Internal" if you're part of a Google Workspace organization
3. Click "Create"

### Fill in OAuth Consent Screen Information

#### App Information
- **App name**: `MirrorBuddy`
- **User support email**: Your email address
- **App logo**: (Optional) Upload your app logo (120x120 px PNG/JPG)
- **App domain**:
  - **Application home page**: (Optional) Your app website
  - **Application privacy policy link**: (Optional) Your privacy policy URL
  - **Application terms of service link**: (Optional) Your terms of service URL
- **Authorized domains**: Add your domain if applicable
- **Developer contact information**: Your email address

4. Click "Save and Continue"

#### Scopes
1. Click "Add or Remove Scopes"
2. Add the following scopes for Google Drive access:
   - `https://www.googleapis.com/auth/drive.readonly` - View and download files
   - `https://www.googleapis.com/auth/drive.metadata.readonly` - View metadata
   - `https://www.googleapis.com/auth/drive.file` - View and manage specific files
   - `https://www.googleapis.com/auth/userinfo.profile` - View basic profile info
   - `https://www.googleapis.com/auth/userinfo.email` - View email address

3. Click "Update"
4. Click "Save and Continue"

#### Test Users (For External User Type Only)
If you selected "External" user type and haven't published your app:
1. Click "Add Users"
2. Enter email addresses of test users
3. Click "Add"
4. Click "Save and Continue"

#### Summary
1. Review your OAuth consent screen configuration
2. Click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click "Create Credentials" > "OAuth client ID"
3. Select **Application type**: "iOS"
4. Enter **Name**: `MirrorBuddy iOS Client`
5. Enter **Bundle ID**: Your app's bundle identifier (e.g., `com.yourcompany.mirrorbuddy`)
6. Click "Create"

### Download Credentials

After creating the OAuth client:
1. You'll see a modal with your **Client ID**
2. Copy and save your **Client ID** - you'll need this in the app
3. Click "OK"

### Alternative: Use "Other" Application Type

If you encounter issues with iOS app type, you can use:
1. **Application type**: "Other" or "Desktop app"
2. **Name**: `MirrorBuddy Desktop Client`
3. Click "Create"
4. Copy both **Client ID** and **Client Secret**

## Step 5: Configure Redirect URIs (If Using Desktop/Other Type)

1. In the credentials list, click on your OAuth client
2. Under "Authorized redirect URIs", add:
   - `com.googleusercontent.apps.[YOUR_CLIENT_ID]:/oauth2redirect`
   - Replace `[YOUR_CLIENT_ID]` with your actual reversed client ID
3. Click "Save"

## Step 6: Store Credentials in MirrorBuddy

### Using KeychainManager

After obtaining your OAuth credentials, you'll store them securely in the app:

```swift
import MirrorBuddy

// Store Google OAuth client credentials
let keychain = KeychainManager.shared

do {
    try await keychain.saveGoogleClientCredentials(
        clientID: "YOUR_CLIENT_ID_HERE",
        clientSecret: "YOUR_CLIENT_SECRET_HERE" // Only if using Desktop/Other type
    )
    print("✅ Google OAuth credentials stored successfully")
} catch {
    print("❌ Failed to store credentials: \(error)")
}
```

### Environment Variables (Development Only)

For development/testing, you can also use environment variables:

1. Create or edit `.env` file in project root:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

2. Add `.env` to `.gitignore` to prevent committing credentials

## Step 7: Test OAuth Flow

Once credentials are configured:

1. Launch MirrorBuddy app
2. Navigate to Settings > Google Drive
3. Tap "Connect Google Drive"
4. You should see the Google OAuth consent screen
5. Sign in with your Google account
6. Grant permissions
7. You should be redirected back to the app

## Troubleshooting

### "Access blocked: This app's request is invalid"

**Problem**: OAuth consent screen not properly configured

**Solution**:
- Ensure all required fields in OAuth consent screen are filled
- Add your test email to "Test users" if using External user type
- Verify authorized domains are correct

### "redirect_uri_mismatch"

**Problem**: Redirect URI doesn't match configured URIs

**Solution**:
- Verify redirect URI in app matches Google Cloud Console configuration
- For iOS apps, use: `com.googleusercontent.apps.[REVERSED_CLIENT_ID]:/oauth2redirect`
- Ensure no trailing slashes or typos

### "invalid_client"

**Problem**: Client ID or Client Secret is incorrect

**Solution**:
- Verify you copied the complete Client ID
- Check for extra spaces or characters
- Regenerate credentials if necessary

### "access_denied"

**Problem**: User denied permissions or not authorized

**Solution**:
- Ensure test user is added in OAuth consent screen (for External type)
- Verify required scopes are configured
- Check if app is in production or testing mode

## Publishing Your App (Optional)

To allow any Google user to authenticate:

1. Navigate to **OAuth consent screen**
2. Click "Publish App"
3. Submit for verification (required for sensitive/restricted scopes)
4. Wait for Google review (can take several days)

## Security Best Practices

1. **Never commit credentials to source control**
   - Add `.env` to `.gitignore`
   - Use Keychain for secure storage in production

2. **Use least privilege scopes**
   - Only request necessary Google Drive permissions
   - Don't request broader access than needed

3. **Rotate credentials periodically**
   - Generate new OAuth credentials every 6-12 months
   - Revoke old credentials after rotation

4. **Monitor OAuth usage**
   - Check Google Cloud Console for unusual activity
   - Enable Cloud Audit Logs for OAuth events

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [iOS OAuth 2.0 Flow](https://developers.google.com/identity/protocols/oauth2/native-app)
- [ASWebAuthenticationSession Documentation](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession)

## Support

If you encounter issues not covered in this guide:
1. Check [Google Cloud Console Help](https://console.cloud.google.com/support)
2. Review [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) for testing
3. Consult [Stack Overflow](https://stackoverflow.com/questions/tagged/google-oauth) with tag `google-oauth`
