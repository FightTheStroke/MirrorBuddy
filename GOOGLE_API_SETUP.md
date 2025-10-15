# Google API Setup Instructions

## Problem

If you see these errors in the logs:
```
HTTP 403: Google Drive API has not been used in project
```

The Google Cloud APIs are not enabled for your project.

## Solution

### 1. Go to Google Cloud Console

Open: https://console.cloud.google.com/apis/library

Make sure you're using the same project where you created OAuth credentials.

### 2. Enable Required APIs

Search for and **enable** each of these:

#### ✅ Google Drive API
- URL: https://console.cloud.google.com/apis/library/drive.googleapis.com
- Click **"Enable"**

#### ✅ Gmail API
- URL: https://console.cloud.google.com/apis/library/gmail.googleapis.com
- Click **"Enable"**

#### ✅ Google Calendar API
- URL: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
- Click **"Enable"**

### 3. Wait for Propagation

After enabling, wait **1-2 minutes** for the changes to propagate.

### 4. Test in App

1. Rebuild and run the app
2. Go to **Settings** → **Connect Google Drive**
3. Sign in with Google
4. The authentication should now work without 403 errors

## Quick Check

You can verify APIs are enabled at:
https://console.cloud.google.com/apis/dashboard

You should see:
- ✅ Google Drive API: Enabled
- ✅ Gmail API: Enabled
- ✅ Google Calendar API: Enabled

## Troubleshooting

If errors persist:
1. Check you're in the **correct project** (same as OAuth credentials)
2. Try **disabling and re-enabling** the APIs
3. Wait a few more minutes for propagation
4. Check **API quotas** aren't exceeded
