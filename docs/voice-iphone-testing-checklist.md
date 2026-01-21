# iPhone Voice Testing Checklist (F-07)

**Requirement**: Voice funziona su iPhone iOS17+ (test reale dal device)

**Status**: Manual user test required on real iPhone device

---

## Pre-Flight Checklist

Before starting voice tests, verify your iPhone is ready:

- [ ] iPhone running iOS 17 or later
- [ ] Safari is updated to latest version
- [ ] WiFi connected to same network as dev machine (for local testing)
- [ ] Microphone permission granted to Safari in Settings > Safari > Microphone
- [ ] Speaker working (test with any audio app first)
- [ ] Do Not Disturb mode OFF
- [ ] Low Power Mode OFF (can affect audio processing)

### Check iOS Version
**Settings > General > About > Version** should show 17.x or higher

### Check Microphone Permission
**Settings > Safari > Microphone** - Set to "Allow"

---

## Setup: Running the App on iPhone

### Option A: Local Network (Easiest for home testing)

**On Mac (development machine)**:

```bash
npm run dev
```

App runs at `http://localhost:3000`

**On iPhone**:

1. Find your Mac's local IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Look for `192.168.x.x` or `10.0.x.x`

2. On iPhone, open Safari and navigate to:
   ```
   http://YOUR-MAC-IP:3000
   ```
   Example: `http://192.168.1.100:3000`

3. You should see MirrorBuddy home page

---

### Option B: ngrok (If testing remotely or mobile hotspot)

**On Mac**:

```bash
# Install ngrok if needed
brew install ngrok/ngrok/ngrok

# Start dev server
npm run dev

# In new terminal: expose locally
ngrok http 3000
```

ngrok will display:
```
Forwarding        https://xxxx-yy-zzz.ngrok.io -> http://localhost:3000
```

**On iPhone**:

- Open Safari
- Navigate to the ngrok HTTPS URL (must be HTTPS)
- Accept browser warnings (ngrok certs)

---

## Step-by-Step Voice Test Procedure

### Test 1: Voice Playback (Maestro Greeting)

**Procedure**:

1. Load MirrorBuddy in Safari on iPhone
2. Navigate to **Chat** or select a **Maestro**
3. Tap the maestro's avatar or name to start chat
4. Wait for maestro greeting to display
5. Look for audio player controls
6. Tap the **play button** to hear the voice greeting

**Expected Outcome**:
- Voice audio plays through iPhone speaker
- No crackling or distortion
- Audio continues to completion
- Volume control works

**Success Criteria**:
- [ ] Audio plays without interruption
- [ ] Speaker volume is adequate
- [ ] No strange artifacts or stuttering

---

### Test 2: Voice Recording (Student Mic)

**Procedure**:

1. In active chat, locate the **microphone button** (usually in input area)
2. Tap and **hold the microphone** to start recording
3. Speak clearly: "Hello, this is a test message"
4. **Release to stop recording**
5. Wait for processing
6. Observe the response

**Expected Outcome**:
- Microphone activates without errors
- Recording indicator shows (animated pulse)
- Transcription displays user text
- Maestro responds (audio or text)

**Success Criteria**:
- [ ] Microphone records audio
- [ ] No permission denied error
- [ ] Text transcription appears
- [ ] Response is generated

---

### Test 3: Audio Playback After Recording

**Procedure**:

1. After maestro responds, locate the **response audio player**
2. Tap **play** to hear the maestro's voice response
3. Listen to full response

**Expected Outcome**:
- Maestro's voice response plays
- Audio quality is clear
- Correct response to your input

**Success Criteria**:
- [ ] Response audio plays
- [ ] Audio matches message content
- [ ] No skipped portions

---

### Test 4: Network Condition Test (Optional but Recommended)

**Procedure**:

1. Open **Settings > Developer Settings** (if available)
2. Simulate slow 4G or WiFi with packet loss
3. Repeat Test 2 (voice recording)
4. Observe timeout/retry behavior

**Expected Outcome**:
- App gracefully handles network delays (no 30+ second hangs)
- User receives timeout message if network unavailable
- Can retry without page reload

**Success Criteria**:
- [ ] App responsive (< 30 second wait)
- [ ] Clear error message on failure
- [ ] Can retry operation

---

## Safari Remote Debugging (Capture Console Logs)

### Setup Remote Debugging (One-time on Mac)

1. **On iPhone**:
   - Settings > Safari > Advanced
   - Enable "Web Inspector"

2. **On Mac** (with iPhone connected via USB):
   - Open Safari
   - Menu: **Develop** (top menu bar)
   - If Develop menu not visible: Safari > Settings > Advanced > "Show Develop menu in menu bar"

3. **In Develop menu**:
   - Select iPhone name
   - Select the Safari tab running MirrorBuddy

### Viewing Logs During Test

Once remote inspector is open:

1. Tap **Console** tab
2. Run voice test (Test 2: Voice Recording)
3. Watch console output in real-time

**Key logs to look for**:

```
[SUCCESS] Microphone recording started
[SUCCESS] Transcription complete: "user text here"
[SUCCESS] Audio playback started
```

**Error logs to flag**:

```
[ERROR] Microphone permission denied
[ERROR] Transcription failed
[ERROR] Audio context not initialized
[ERROR] Network timeout after 30 seconds
```

---

## Log Collection and Interpretation

### Logs Indicating SUCCESS (F-07 Pass)

```javascript
// Microphone recording works
[14:23:45.123] [mic-recorder] Recording initialized
[14:23:47.456] [mic-recorder] Audio data captured (16384 samples)
[14:23:48.789] [transcription] Text received: "hello test"
[14:23:49.234] [audio-player] Playback started - voice response
[14:23:52.567] [audio-player] Playback completed successfully
```

**This means**: Full voice loop works end-to-end ✓

---

### Logs Indicating FAILURE (Needs Fix)

**Microphone Permission**:
```javascript
[14:24:01.123] [mic-recorder] ERROR: NotAllowedError - Permission denied
```
→ Fix: Go to **Settings > Safari > Microphone** and enable

**Audio Not Playing**:
```javascript
[14:24:15.456] [audio-player] ERROR: Audio context not initialized
```
→ Fix: Speaker may be muted, check hardware mute switch

**Network Timeout**:
```javascript
[14:24:30.000] [transcription] ERROR: Request timeout after 30000ms
```
→ Check WiFi connection, try local test instead of ngrok

**iOS-Specific Issue**:
```javascript
[14:24:45.789] [ios-detection] WARNING: Detected iOS with non-standard audio behavior
```
→ Report to dev team with full console dump

---

## Common Issues and Troubleshooting

### Issue: "Microphone permission denied"

**Cause**: Safari doesn't have microphone access

**Solution**:
1. Settings > Safari > Microphone → Set to "Allow"
2. Settings > Privacy & Security > Microphone → Verify Safari is listed
3. Close Safari completely (swipe up from bottom)
4. Reopen and retry

---

### Issue: "No sound output"

**Cause**: Volume or mute switch issues

**Solution**:
1. Check **physical mute switch** on left side of iPhone (should be unmuted/red)
2. Volume slider should be up (Settings > Sounds & Haptics > Volume)
3. Test with Music app first to verify speaker works
4. Try playing voice on different maestro

---

### Issue: "Audio is crackling or stuttering"

**Cause**: Network latency, audio buffer issue, or background processing

**Solution**:
1. Close all other apps (double-tap home, swipe up)
2. Ensure strong WiFi signal (move closer to router)
3. Try on 5GHz WiFi if available
4. Restart Safari
5. Try different maestro to isolate issue

---

### Issue: "Recording starts but no transcription"

**Cause**: Audio data not being sent, network issue, or backend timeout

**Solution**:
1. Check network connection (WiFi signal shows 3+ bars)
2. Try shorter recording (2-3 seconds)
3. Speak more clearly (test with phone app voice control first)
4. Open Console tab and look for transcription errors
5. Check if backend is running (`npm run dev` on Mac)

---

### Issue: "Long delay after recording (> 10 seconds)"

**Cause**: Network latency or backend processing queue

**Solution**:
1. Verify network: Fast WiFi for local, 4G+ for ngrok
2. Reduce background processes on Mac
3. Try with different maestro (lighter subject might be faster)
4. If consistently slow, note timing in bug report

---

## Test Report Template

Use this template to document your test results:

```markdown
## iPhone Voice Test Report (F-07)

**Date**: [YYYY-MM-DD]
**Tester**: [Your name]
**Device**: iPhone [model] - iOS [version]
**Network**: [Local/ngrok/4G]
**Browser**: Safari

### Pre-Flight
- [x] iOS 17+
- [x] Microphone permission granted
- [x] WiFi connected

### Test Results

#### Test 1: Voice Playback
- Status: [PASS/FAIL]
- Notes: [Any observations]
- Console errors: [None/list]

#### Test 2: Voice Recording
- Status: [PASS/FAIL]
- Recorded text: "[what was said]"
- Transcription accuracy: [Good/Fair/Poor]
- Console errors: [None/list]

#### Test 3: Response Playback
- Status: [PASS/FAIL]
- Response quality: [Clear/Muffled/Stuttering]
- Console errors: [None/list]

#### Test 4: Network Condition (if done)
- Status: [PASS/FAIL/SKIPPED]
- Notes: [Behavior under slow network]

### Overall
- F-07 Verdict: [PASS/FAIL]
- Critical issues found: [None/list]
- Next steps: [Retry test/Contact support/Ready to close]

### Console Dump
[Paste key logs from Safari inspector]
```

---

## Passing Criteria (F-07 Acceptance)

**All of the following must be TRUE**:

1. ✓ Voice greeting plays on tap without errors
2. ✓ Microphone records user speech without permission errors
3. ✓ Transcription converts audio to text correctly
4. ✓ Maestro response audio plays back clearly
5. ✓ No crackling, stuttering, or audio artifacts
6. ✓ No console errors related to audio context, permissions, or network
7. ✓ Response time acceptable (< 15 seconds for transcription)
8. ✓ Microphone can be reused multiple times in same session

**If all above pass on iOS 17+**: F-07 verification **COMPLETE** ✓

---

## Next Steps

1. **Run tests** using steps above (Test 1-4)
2. **Capture console logs** using Safari Remote Debugger
3. **Document results** using template above
4. **Report findings** back to dev team:
   - All tests passed → F-07 verified
   - Tests failed → Share console dump, error details, and reproduction steps

---

## Reference Documents

- **F-07 Requirement**: Voice funziona su iPhone iOS17+
- **Previous work**:
  - T3-01: Voice logging added
  - T3-02: Investigation report completed
  - T3-03: iOS fixes implemented
- **Voice API Docs**: `docs/voice-api.md`
- **iOS Audio Issues**: `docs/adr/0059-e2e-test-setup-requirements.md`

---

## Support

If you encounter issues not covered here:

1. Open Safari Remote Debugger (instructions above)
2. Export full console output
3. Note exact steps to reproduce
4. Contact dev team with:
   - Device/iOS version
   - Network type (local/ngrok/4G)
   - Console output
   - Test number where it failed

**Last Updated**: January 2026
**Status**: Ready for user testing
