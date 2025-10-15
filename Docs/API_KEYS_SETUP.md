# API Keys Setup Guide

## Overview

MirrorBuddy supports optional AI service integrations for advanced features like summaries, mind maps, and image generation. API keys are **optional** - the app works without them for basic features.

---

## Supported Services

| Service | Purpose | Required? |
|---------|---------|-----------|
| **OpenAI** | Text summaries, explanations, chat | Optional |
| **Anthropic** | Alternative to OpenAI (Claude models) | Optional |
| **Google Gemini** | Mind map generation | Optional |
| **Stability AI** | Image generation for mind maps | Optional |

---

## Setup Methods

### Method 1: Using APIKeys-Info.plist (Recommended for Development)

This method hardcodes API keys in a plist file similar to Google OAuth configuration.

#### Steps:

1. **Copy the example file**:
   ```bash
   cp MirrorBuddy/Resources/APIKeys-Info.plist.example \
      MirrorBuddy/Resources/APIKeys-Info.plist
   ```

2. **Edit `APIKeys-Info.plist`** and replace placeholders with your keys:
   ```xml
   <key>OPENAI_API_KEY</key>
   <string>sk-YOUR_ACTUAL_OPENAI_KEY</string>

   <key>ANTHROPIC_API_KEY</key>
   <string>sk-ant-YOUR_ACTUAL_ANTHROPIC_KEY</string>

   <key>GEMINI_API_KEY</key>
   <string>YOUR_ACTUAL_GEMINI_KEY</string>

   <key>STABILITY_API_KEY</key>
   <string>sk-YOUR_ACTUAL_STABILITY_KEY</string>
   ```

3. **Verify .gitignore protection**:
   ```bash
   # Check that APIKeys-Info.plist is ignored
   git status
   # Should NOT show APIKeys-Info.plist
   ```

4. **Build and run** - keys will be loaded automatically

---

### Method 2: Manual Configuration in App

Users can configure keys directly in the app settings:

1. Open the app
2. Go to **Settings** → **API Configuration**
3. Enter API keys manually
4. Keys are stored in iOS Keychain/UserDefaults

---

## Obtaining API Keys

### OpenAI API Key

1. Go to: https://platform.openai.com/account/api-keys
2. Sign in or create account
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-`)
5. Save it in `APIKeys-Info.plist`

**Pricing**: Pay-as-you-go, ~$0.002 per request for GPT-4o-mini

### Anthropic API Key

1. Go to: https://console.anthropic.com/account/keys
2. Sign in or create account
3. Click **"Create Key"**
4. Copy the key (starts with `sk-ant-`)
5. Save it in `APIKeys-Info.plist`

**Pricing**: Similar to OpenAI, Claude 3.5 Sonnet recommended

### Google Gemini API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click **"Create API key"**
4. Copy the key (starts with `AIza`)
5. Save it in `APIKeys-Info.plist`

**Pricing**: Free tier available (60 requests/minute)

### Stability AI API Key

1. Go to: https://platform.stability.ai/account/keys
2. Sign in or create account
3. Click **"Create API Key"**
4. Copy the key (starts with `sk-`)
5. Save it in `APIKeys-Info.plist`

**Pricing**: Pay-as-you-go for image generation

---

## Security Best Practices

### ✅ DO:

- ✅ Keep `APIKeys-Info.plist` in `.gitignore`
- ✅ Never commit API keys to Git
- ✅ Use environment variables for CI/CD
- ✅ Regenerate keys if accidentally exposed
- ✅ Set spending limits on API provider dashboards

### ❌ DON'T:

- ❌ Don't share `APIKeys-Info.plist` publicly
- ❌ Don't commit keys to version control
- ❌ Don't use production keys in development
- ❌ Don't share keys in screenshots or logs

---

## File Structure

### Important Files

| File | Purpose | Committed to Git? |
|------|---------|-------------------|
| `APIKeys-Info.plist` | Your actual API keys | ❌ NO (in .gitignore) |
| `APIKeys-Info.plist.example` | Template for keys | ✅ YES |
| `APIKeysConfig.swift` | Loads keys at runtime | ✅ YES |
| `OpenAIConfiguration.swift` | OpenAI client config | ✅ YES |
| `.gitignore` | Protects credentials | ✅ YES |

---

## Troubleshooting

### Error: "Chiave API OpenAI non configurata"

**Cause**: No API key found

**Solution**:
1. Check `APIKeys-Info.plist` exists in `MirrorBuddy/Resources/`
2. Verify the key is not the placeholder value (`sk-YOUR_...`)
3. Clean build (Cmd+Shift+K) and rebuild
4. Restart the app

### Keys Not Loading

**Solution**:
1. Verify plist file location:
   ```bash
   ls -la MirrorBuddy/Resources/APIKeys-Info.plist
   ```
2. Check plist syntax (valid XML)
3. Ensure keys don't start with placeholder text

### Accidentally Committed Keys to Git

**Solution**:
1. **Immediately regenerate keys** on provider website
2. Remove from Git history:
   ```bash
   git rm --cached MirrorBuddy/Resources/APIKeys-Info.plist
   git commit -m "Remove leaked API keys"
   git push
   ```
3. Update `.gitignore` if not present
4. Never reuse exposed keys

---

## Production Deployment

For App Store deployment, API keys should **NOT** be bundled with the app:

1. Remove `APIKeys-Info.plist` from release builds
2. Use in-app purchase or subscription to provide AI features
3. Call your own backend server with server-side API keys
4. Never expose API keys in client-side code

---

## Cost Estimates

Typical usage costs for a student using the app:

| Feature | Service | Monthly Cost |
|---------|---------|--------------|
| Summaries | OpenAI GPT-4o-mini | ~$0.50 |
| Mind Maps | Google Gemini | Free |
| Explanations | OpenAI GPT-4o | ~$2.00 |
| Images | Stability AI | ~$1.00 |
| **Total** | | **~$3.50/month** |

*Estimates based on 50 documents processed per month*

---

## Environment Variables (Optional for CI/CD)

For automated testing and CI/CD:

```bash
# .env file (not committed)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
STABILITY_API_KEY=sk-...
```

Load in CI/CD pipeline as secrets, not in the iOS app.

---

## Support

### Useful Links

- **OpenAI Platform**: https://platform.openai.com/
- **Anthropic Console**: https://console.anthropic.com/
- **Google AI Studio**: https://makersuite.google.com/
- **Stability AI**: https://platform.stability.ai/

---

**Last Updated**: October 2025
**App Version**: 1.0
**Maintained By**: MirrorBuddy Development Team
