# MirrorBuddy Resources

## Google OAuth Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new project (if needed)
3. Enable APIs: **Google Drive API**, **Gmail API**, **Calendar API**
4. Create **OAuth 2.0 Client ID**:
   - Application type: **iOS**
   - Bundle ID: `com.mirror-labs.MirrorBuddy`
5. Download the configuration file

### 2. Setup Local Configuration

1. Copy your downloaded plist file to:
   ```
   MirrorBuddy/Resources/GoogleService-Info.plist
   ```

   Or manually create it from the template:
   ```bash
   cp GoogleService-Info.plist.example GoogleService-Info.plist
   ```

2. Update `CLIENT_ID` and `REVERSED_CLIENT_ID` with your values

### 3. Security

⚠️ **IMPORTANT**: `GoogleService-Info.plist` is in `.gitignore` and should **NEVER** be committed to Git.

The template file (`GoogleService-Info.plist.example`) is committed as reference only.
